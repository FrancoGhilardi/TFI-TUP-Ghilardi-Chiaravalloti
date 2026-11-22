# Diagramas de secuencia · Librería Mi Sueño

## Introducción

Este documento reúne los diagramas de secuencia de los flujos más importantes del backend. Cada diagrama sigue el recorrido real de una operación a través de las capas del sistema: el controlador y los guards de la presentación, el caso de uso de la aplicación, el dominio y la infraestructura (base de datos, almacenamiento de archivos y envío de correos).

Los flujos están agrupados por módulo:

| Grupo | Diagramas |
| --- | --- |
| Transversal | 1. Recorrido de una petición |
| Identidad: sesiones | 2. Inicio de sesión · 3. Renovación de la sesión · 4. Cierre de sesión |
| Identidad: contraseñas | 5. Cambio de contraseña propia · 6. Olvido de contraseña · 7. Reseteo de contraseña por un administrador |
| Identidad: usuarios | 8. Alta de usuario · 9. Baja de usuario · 10. Limpieza de sesiones vencidas |
| Catálogo: productos | 11. Alta de producto con imágenes · 12. Edición de producto · 13. Baja y reactivación de producto |
| Catálogo: imágenes | 14. Procesado de una imagen · 15. Reprocesado de imágenes demoradas · 16. Reemplazo del archivo de una imagen · 17. Eliminación de una imagen |
| Catálogo: categorías | 18. Baja de categoría |
| Catálogo: tienda pública | 19. Listado y búsqueda en el catálogo · 20. Ficha de producto · 21. Búsqueda global |
| Catálogo: tareas programadas | 22. Limpieza de ofertas y novedades vencidas |

## Convenciones

- Las flechas continuas son llamadas y las punteadas, respuestas.
- `Cliente` es el frontend (tienda o panel) y `API` agrupa al controlador de NestJS de cada ruta.
- `BD` es PostgreSQL (Supabase en local). `Storage` es Supabase Storage, con un bucket privado para los originales y uno público para las versiones que muestra la tienda.
- `Transacción` indica que lo que está dentro corre en una única transacción de base de datos. Los bloqueos de fila (`FOR UPDATE`) se hacen dentro de ella.
- Los errores se devuelven siempre con la misma forma (`statusCode`, `code`, `message`, `details`, `path`, `timestamp`) y los mensajes que ve el usuario están en español. En los diagramas se nombra el `code` de cada error.
- Las contraseñas y los tokens nunca viajan ni se guardan en claro: la base guarda solo hashes. El access token vive en memoria del navegador y el refresh token, en una cookie `HttpOnly`.

---

## 1. Recorrido de una petición

Todas las rutas pasan por la misma cadena de guards, registrados globalmente en este orden. El límite de frecuencia va primero para que una petición bloqueada nunca llegue a la base de datos. Las rutas marcadas como públicas se saltan la autenticación.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant RL as RateLimitGuard
    participant JWT as JwtAuthGuard
    participant PWD as MustChangePasswordGuard
    participant ROL as RolesGuard
    participant VP as ValidationPipe
    participant CT as Controlador
    participant UC as Caso de uso
    participant BD as BD
    participant EF as ErrorResponseFilter

    C->>RL: Petición HTTP
    alt Superó el límite por IP (100 por minuto, o el límite estricto de la ruta)
        RL-->>EF: TOO_MANY_REQUESTS
        EF-->>C: 429 con Retry-After
    end
    RL->>JWT: Continúa
    alt Ruta pública
        JWT->>PWD: Se salta la autenticación
    else Ruta protegida
        JWT->>JWT: Verifica el access token (Bearer)
        JWT->>UC: ResolveAuthenticatedUser(userId, emitido en)
        UC->>BD: Lee el usuario
        BD-->>UC: Usuario con su rol y estado actuales
        UC-->>JWT: Usuario autenticado
        Note over JWT,UC: El rol y el estado salen siempre de la base. Se rechaza si el usuario no existe o no puede entrar, o si el token es anterior al último cambio de contraseña
        JWT-->>EF: INVALID_ACCESS_TOKEN (401)
    end
    JWT->>PWD: Continúa con request.user
    alt Tiene un cambio de contraseña pendiente y la ruta no lo permite
        PWD-->>EF: PASSWORD_CHANGE_REQUIRED (403)
    end
    PWD->>ROL: Continúa
    alt El rol no está entre los permitidos de la ruta
        ROL-->>EF: INSUFFICIENT_ROLE (403)
    end
    ROL->>VP: Continúa
    VP->>VP: Valida y transforma el cuerpo, los parámetros y la query
    alt Datos inválidos
        VP-->>EF: VALIDATION_FAILED (400) con el detalle por campo
    end
    VP->>CT: DTO válido
    CT->>UC: execute(comando)
    UC-->>CT: Resultado
    CT-->>C: 200, 201 o 204 con el cuerpo tipado
    EF-->>C: Respuesta de error con el formato común
```

---

## Identidad: sesiones

### 2. Inicio de sesión

Todos los fallos devuelven el mismo error y cada intento hace exactamente dos comprobaciones de contraseña (la actual y la temporal, o un señuelo si no hay), de modo que ni la respuesta ni el tiempo revelan si la cuenta existe o tiene una clave temporal pendiente. El hash, que es lento, se calcula antes de abrir la transacción para no retener una conexión.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant API as AuthController
    participant UC as LoginUseCase
    participant H as PasswordHasher
    participant BD as BD
    participant SI as SessionIssuer

    C->>API: POST /auth/login (email, contraseña)
    Note over C,API: Ruta pública con límite estricto por IP
    API->>UC: execute(email, contraseña, user agent)
    UC->>BD: Busca el usuario por email
    BD-->>UC: Usuario, o nada
    UC->>H: Verifica contra la contraseña actual (o contra un señuelo)
    UC->>H: Verifica contra la contraseña temporal vigente (o contra un señuelo)
    alt Ninguna coincide, no existe o no puede entrar
        UC-->>API: INVALID_CREDENTIALS
        API-->>C: 401
    end
    UC->>BD: Abre la transacción y lee de nuevo el usuario, bloqueado
    UC->>UC: Confirma que sigue siendo el mismo y que el hash que coincidió no cambió
    alt Entró con la contraseña actual
        UC->>UC: Descarta la clave temporal pendiente
    else Entró con la clave temporal
        UC->>UC: Consume la clave temporal, que pasa a ser la contraseña y queda el cambio pendiente
    end
    UC->>UC: Registra el último acceso
    UC->>BD: Guarda el usuario
    UC->>SI: issue(usuario, user agent)
    SI->>BD: Guarda la sesión (hash del refresh token, familia nueva, vencimiento)
    SI-->>UC: Access token y refresh token
    UC-->>API: Sesión
    API-->>C: 200 con el access token y el usuario, y Set-Cookie con el refresh token HttpOnly
    Note over C: Si mustChangePassword es verdadero, el panel lleva a cambiar la contraseña
```

### 3. Renovación de la sesión (rotación del refresh token)

Cada refresh token sirve una sola vez. Si se vuelve a presentar uno ya rotado puede haber sido robado, y se revocan todas las sesiones del usuario. El resultado se confirma dentro de la transacción, así la revocación queda guardada aunque después se rechace la petición.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant OG as OriginGuard
    participant API as AuthController
    participant UC as RefreshSessionUseCase
    participant BD as BD
    participant SI as SessionIssuer
    participant LOG as Log de seguridad

    C->>OG: POST /auth/refresh con la cookie del refresh token
    alt El origen no es el del frontend
        OG-->>C: 403 ORIGIN_NOT_ALLOWED
    end
    OG->>API: Continúa
    API->>UC: execute(refresh token, user agent)
    UC->>BD: Busca la sesión por el hash del token, sin bloqueo
    alt No existe o ya venció
        UC-->>C: 401 INVALID_SESSION
    end
    UC->>BD: Transacción: bloquea primero al usuario y después la sesión
    Note over UC,BD: El mismo orden que sigue el trigger que revoca sesiones, para que un refresh y un cambio de contraseña no se bloqueen entre sí
    alt La sesión ya fue rotada (token reutilizado)
        UC->>BD: Revoca todas las sesiones del usuario
        UC->>LOG: Registra la reutilización del refresh token
        UC-->>C: 401 INVALID_SESSION
    else Fue revocada por otro motivo (cierre de sesión, cambio de clave o de rol)
        UC-->>C: 401 INVALID_SESSION
    else Vigente
        UC->>BD: Marca la sesión como rotada
        alt El usuario ya no puede entrar
            UC-->>C: 401 INVALID_SESSION
        end
        UC->>SI: issue(usuario, user agent, misma familia)
        SI->>BD: Guarda la sesión nueva
        SI-->>UC: Tokens nuevos
        UC-->>API: Sesión
        API-->>C: 200 con un access token nuevo y Set-Cookie con el refresh token nuevo
    end
    Note over API,C: Ante cualquier INVALID_SESSION el controlador también borra la cookie, para que el navegador deje de mandar un token muerto
```

### 4. Cierre de sesión

El cierre nunca falla por el token: si falta o no se conoce, no hay nada que cerrar. Cierra la sesión y toda su familia, incluidas las que nacieron de rotarla, y deja intactas las sesiones de otros dispositivos.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant OG as OriginGuard
    participant API as AuthController
    participant UC as LogoutUseCase
    participant BD as BD

    C->>OG: POST /auth/logout con la cookie
    OG->>API: Origen permitido
    API->>UC: execute(refresh token)
    alt No hay cookie o la sesión no existe
        UC-->>API: Nada que cerrar
    else Existe la sesión
        UC->>BD: Transacción: bloquea al usuario
        Note over UC,BD: Espera a un refresh en curso para ver la sesión que ese refresh crea
        UC->>BD: Revoca toda la familia de la sesión
    end
    API-->>C: 204 y Set-Cookie que borra el refresh token
```

---

## Identidad: contraseñas

### 5. Cambio de contraseña propia

Sirve también para salir del estado de cambio pendiente (clave temporal o reseteo). Cambiar la contraseña revoca todas las sesiones en la base de datos, por eso se inicia una nueva para el dispositivo que hizo el cambio.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant G as Guards
    participant API as AuthController
    participant UC as ChangePasswordUseCase
    participant H as PasswordHasher
    participant BD as BD
    participant SI as SessionIssuer

    C->>G: POST /auth/change-password (actual, nueva)
    Note over G: Límite estricto. Admite al usuario con cambio pendiente
    G->>API: Usuario autenticado
    API->>UC: execute(userId, actual, nueva, user agent)
    UC->>UC: Valida las reglas de la contraseña nueva
    UC->>BD: Lee al usuario
    UC->>H: Verifica la contraseña actual
    alt La actual no coincide
        UC-->>C: 400 INVALID_CURRENT_PASSWORD
    end
    alt La nueva es igual a la actual
        UC-->>C: 422 PASSWORD_UNCHANGED
    end
    UC->>H: Calcula el hash de la nueva
    UC->>BD: Transacción: lee al usuario bloqueado
    UC->>UC: Confirma que el hash verificado no cambió
    UC->>UC: Cambia la contraseña, termina el cambio pendiente y descarta la clave temporal
    UC->>BD: Guarda el usuario
    Note over UC,BD: La base revoca todas las sesiones del usuario
    UC->>SI: issue(usuario, user agent)
    SI->>BD: Guarda la sesión nueva
    SI-->>UC: Tokens
    UC-->>API: Sesión
    API-->>C: 200 con el access token nuevo y Set-Cookie con el refresh token nuevo
```

### 6. Olvido de contraseña

La respuesta es siempre 204, exista o no la cuenta, y no espera al trabajo real: buscar la cuenta, calcular el hash y enviar el correo corren en segundo plano, para que el tiempo de respuesta no delate si el email existe. La clave temporal convive con la actual hasta que se usa o vence.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant API as AuthController
    participant BG as BackgroundTasks
    participant UC as RequestPasswordResetUseCase
    participant TF as TemporaryPasswordFactory
    participant BD as BD
    participant MAIL as Notificador (Resend)

    C->>API: POST /auth/forgot-password (email)
    Note over C,API: Ruta pública con límite estricto
    API->>BG: Encola la solicitud
    API-->>C: 204 siempre
    BG->>UC: execute(email)
    UC->>BD: Busca el usuario por email
    UC->>TF: Genera la clave temporal y su hash
    Note over UC,TF: Se hace aunque la cuenta no exista, para que la carga del servidor no la delate
    alt No existe, está deshabilitada o hay una solicitud reciente (espera de 5 minutos)
        UC-->>BG: No hace nada
    end
    UC->>BD: Transacción: lee al usuario bloqueado y repite la comprobación
    UC->>UC: Emite la clave temporal con su vencimiento (30 minutos)
    UC->>BD: Guarda el usuario
    Note over UC,BD: Dos solicitudes a la vez envían un solo correo
    UC->>MAIL: Envía la clave temporal (después de confirmar la transacción)
    alt El proveedor rechazó el correo
        UC->>BD: Transacción: retira la clave si sigue siendo la recién emitida
        UC-->>BG: Falla registrada en el log
    else Falla dudosa (puede haber llegado)
        UC-->>BG: Falla registrada, la clave sigue vigente
    end
    Note over C: La persona entra con la clave del correo, que la obliga a elegir una nueva
```

### 7. Reseteo de contraseña por un administrador

Un administrador genera una clave temporal para otro usuario. Acá el correo se envía con la transacción abierta: si falla, no cambia nada, el usuario conserva su contraseña y sus sesiones, y el administrador puede reintentar.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador
    participant G as Guards
    participant API as UsersController
    participant UC as ResetUserPasswordUseCase
    participant POL as UserAdministrationPolicy
    participant TF as TemporaryPasswordFactory
    participant BD as BD
    participant MAIL as Notificador (Resend)

    A->>G: POST /admin/users/:id/reset-password
    Note over G: Solo ADMIN
    G->>API: Administrador autenticado
    Note over G: Límite estricto de 10 cada 15 minutos por IP
    API->>UC: execute(userId, actorId)
    UC->>BD: Lee al usuario, sin bloqueo
    alt No existe o el id no es un UUID
        UC-->>A: 404 USER_NOT_FOUND
    end
    UC->>POL: assertCanResetPassword(actor, usuario)
    alt Es su propia cuenta
        POL-->>A: 422 SELF_ADMINISTRATION
    end
    alt El usuario está dado de baja
        UC-->>A: 422 USER_DELETED
    end
    UC->>TF: Genera la clave temporal y su hash
    UC->>BD: Transacción: lee al usuario bloqueado y repite las comprobaciones
    UC->>UC: Asigna la clave temporal, descarta cualquier otra pendiente y exige el cambio al entrar
    UC->>BD: Guarda el usuario
    Note over UC,BD: La base revoca las sesiones del usuario
    UC->>MAIL: Envía la clave asignada
    alt El correo falla
        MAIL-->>UC: Error
        UC->>BD: La transacción se revierte
        UC-->>A: 502 MAIL_DELIVERY_FAILED, sin cambios
    end
    UC-->>API: Listo
    API-->>A: 204
```

---

## Identidad: usuarios

### 8. Alta de usuario

El administrador define la contraseña inicial y se la entrega al usuario: no se envía ningún correo. El usuario nace con el cambio de contraseña pendiente.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador
    participant G as Guards
    participant API as UsersController
    participant UC as CreateUserUseCase
    participant H as PasswordHasher
    participant BD as BD

    A->>G: POST /admin/users (email, nombre, rol, contraseña temporal)
    Note over G: Solo ADMIN
    G->>API: Administrador autenticado
    API->>UC: execute(datos, actorId)
    UC->>UC: Valida el email, el nombre y la contraseña
    UC->>BD: ¿Ya existe un usuario no eliminado con ese email?
    alt Ya existe
        UC-->>A: 409 EMAIL_ALREADY_IN_USE
    end
    UC->>H: Calcula el hash de la contraseña
    UC->>UC: Crea el usuario con el cambio de contraseña pendiente y quién lo creó
    UC->>BD: Guarda el usuario
    Note over UC,BD: Dos altas a la vez con el mismo email las frena el índice único
    UC->>BD: Lee el usuario para devolverlo
    UC-->>API: Usuario
    API-->>A: 201 con el usuario
```

### 9. Baja de usuario

La baja es lógica: se guardan la fecha y el autor y la cuenta deja de funcionar. Ningún administrador puede darse de baja a sí mismo y el sistema nunca se queda sin un administrador activo. Dar de baja a quien ya lo está no cambia nada. La edición de rol o estado (`PATCH /admin/users/:id`) aplica las mismas reglas.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador
    participant G as Guards
    participant API as UsersController
    participant UC as DeleteUserUseCase
    participant POL as UserAdministrationPolicy
    participant BD as BD

    A->>G: DELETE /admin/users/:id
    Note over G: Solo ADMIN
    G->>API: Administrador autenticado
    API->>UC: execute(userId, actorId)
    UC->>BD: Transacción: lee al usuario bloqueado
    alt No existe
        UC-->>A: 404 USER_NOT_FOUND
    end
    alt Ya estaba dado de baja
        UC-->>API: No escribe nada, conserva la fecha y el autor originales
    else Está vigente
        opt Es un administrador activo
            UC->>BD: Cuenta los otros administradores activos
        end
        UC->>POL: assertCanDelete(actor, usuario, otros administradores)
        alt Es su propia cuenta
            POL-->>A: 422 SELF_ADMINISTRATION
        else Es el último administrador activo
            POL-->>A: 422 LAST_ACTIVE_ADMIN
        end
        UC->>UC: Registra la baja con la fecha y el autor
        UC->>BD: Guarda el usuario
        Note over UC,BD: La base revoca las sesiones. Dos bajas a la vez las frena un trigger que exige un administrador activo
    end
    API-->>A: 204
```

### 10. Limpieza de sesiones vencidas

Una sesión vencida ya se rechaza al presentarse, así que esta tarea solo mantiene chica la tabla. Las sesiones revocadas pero todavía vigentes se conservan, para seguir detectando la reutilización de un token robado.

```mermaid
sequenceDiagram
    autonumber
    participant CR as Cron (todos los días a las 3 a. m., hora de Argentina)
    participant SCH as SessionsCleanupScheduler
    participant BG as BackgroundTasks
    participant UC as PurgeExpiredSessionsUseCase
    participant BD as BD

    CR->>SCH: Dispara la tarea
    SCH->>BG: Encola la ejecución
    Note over SCH,BG: La app espera a las tareas en segundo plano antes de cerrarse
    BG->>UC: execute()
    UC->>BD: Elimina las sesiones cuyo vencimiento ya pasó
    BD-->>UC: Cantidad eliminada
    UC-->>SCH: Resultado
    SCH->>SCH: Registra la cantidad si fue mayor que cero
```

---

## Catálogo: productos

### 11. Alta de producto con imágenes

Es el flujo más delicado del sistema porque combina la base de datos con el almacenamiento de archivos. Se valida todo antes de subir nada, los originales se suben **antes** de la transacción para no mantenerla abierta durante llamadas de red, y si algo falla entre la primera subida y la confirmación se borran los archivos ya subidos. Las imágenes quedan pendientes y se procesan de forma asíncrona después de confirmar.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant INT as ProductFormInterceptor
    participant API as AdminProductsController
    participant UC as CreateProductUseCase
    participant BD as BD
    participant ST as Storage (bucket privado)
    participant EV as EventPublisher
    participant BG as BackgroundTasks

    A->>G: POST /admin/products (multipart: datos en JSON e imágenes)
    G->>INT: Usuario autenticado con rol ADMIN o SELLER
    INT->>INT: Lee el formulario en memoria con sus límites de tamaño (10 MB por archivo) y de cantidad (hasta 5)
    alt Formulario inválido
        INT-->>A: 400 INVALID_IMAGE, INVALID_IMAGE_COUNT o VALIDATION_FAILED
    end
    INT->>API: Datos y archivos
    API->>UC: execute(comando, imágenes)
    UC->>UC: Valida los datos con las mismas reglas con que se guardarán
    UC->>UC: Comprueba que el título pueda generar un slug
    UC->>UC: Valida la cantidad de imágenes (de 1 a 5) y detecta el formato de cada una por sus bytes
    UC->>BD: Comprueba que las categorías sean visibles y que los relacionados estén vigentes
    alt No lo son
        UC-->>A: 422 CATEGORY_UNAVAILABLE o RELATED_PRODUCT_UNAVAILABLE
    end
    loop Cada imagen, de a una
        UC->>ST: Sube el original con su clave
        Note over UC,ST: Cada clave se anota antes de subirla, por si la subida falla del lado local pero el archivo quedó
    end
    UC->>BD: Abre la transacción
    UC->>BD: Repite las comprobaciones de categorías y relacionados, ahora con bloqueo
    UC->>BD: Genera el SKU y un slug libre a partir del título
    UC->>BD: Guarda el producto con sus categorías y relacionados
    UC->>BD: Guarda las imágenes en estado pendiente
    alt Falla cualquier paso desde la primera subida hasta confirmar
        UC->>BG: Encola el borrado de los originales ya subidos
        UC-->>A: El error original (502 IMAGE_UPLOAD_FAILED si falló una subida)
    end
    UC->>BD: Confirma la transacción
    loop Cada imagen
        UC->>BG: Encola la publicación de ProductImageUploadedEvent
        BG->>EV: publish(evento)
    end
    Note over EV: El procesado de cada imagen continúa en el diagrama 14
    UC->>BD: Lee el detalle del producto
    UC-->>API: Detalle
    API-->>A: 201 con el producto
```

### 12. Edición de producto

Los datos se validan antes de abrir la transacción. El slug y el SKU nunca cambian, ni siquiera con el título. Los productos se bloquean en orden de id para que dos ediciones que relacionan a dos productos entre sí esperen en lugar de trabarse. Una edición que no cambia nada no guarda nada.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant API as AdminProductsController
    participant UC as UpdateProductUseCase
    participant BD as BD

    A->>G: PATCH /admin/products/:id
    G->>API: Rol ADMIN o SELLER
    API->>UC: execute(cambios, actorId)
    UC->>UC: Valida precio, oferta, categorías y relacionados
    UC->>BD: Abre la transacción
    opt Hay relacionados con id menor al del producto
        UC->>BD: Los bloquea primero, en orden de id
    end
    UC->>BD: Lee el producto, bloqueado
    alt No existe
        UC-->>A: 404 PRODUCT_NOT_FOUND
    else Está dado de baja
        UC-->>A: 422 PRODUCT_DELETED
    end
    UC->>UC: Aplica título, descripción, precio y oferta, stock, destacado, novedad y orden
    UC->>UC: Comprueba las fechas contra el momento del cambio
    opt Cambian las categorías
        UC->>BD: Comprueba que las nuevas sean visibles y que alguna quede vigente
        Note over UC,BD: Si no, 422 CATEGORY_UNAVAILABLE. Las categorías que ya tenía se aceptan tal cual
    end
    opt Cambian los relacionados
        UC->>BD: Comprueba que las nuevas estén vigentes
        Note over UC,BD: Hasta 4, sin repetir y sin él mismo. Si no, 400 o 422 RELATED_PRODUCT_UNAVAILABLE o SELF_RELATED_PRODUCT
    end
    alt Hubo cambios reales
        UC->>BD: Guarda el producto
    else Quedó igual
        Note over UC,BD: No guarda nada, para no actualizar updated_at
    end
    UC->>BD: Confirma y lee el detalle
    UC-->>API: Detalle
    API-->>A: 200 con el producto
```

### 13. Baja y reactivación de producto

La baja es lógica: las imágenes, los archivos y los relacionados quedan como están, de modo que reactivar el producto lo devuelve completo. La reactivación exige que al menos una de sus categorías siga vigente.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant API as AdminProductsController
    participant DEL as DeleteProductUseCase
    participant RES as RestoreProductUseCase
    participant BD as BD

    A->>G: DELETE /admin/products/:id
    G->>API: Rol ADMIN o SELLER
    API->>DEL: execute(productId, actorId)
    DEL->>BD: Transacción: lee el producto, bloqueado
    alt No existe
        DEL-->>A: 404 PRODUCT_NOT_FOUND
    else Ya estaba dado de baja
        Note over DEL,BD: No escribe nada y conserva la fecha y el autor de la primera baja
    else Vigente
        DEL->>BD: Guarda la baja con la fecha y el autor
    end
    API-->>A: 204

    A->>G: POST /admin/products/:id/restore
    G->>API: Rol ADMIN o SELLER
    API->>RES: execute(productId, actorId)
    RES->>BD: Transacción: lee el producto, bloqueado
    RES->>BD: Busca las categorías vigentes del producto, con bloqueo compartido
    Note over RES,BD: Si se está dando de baja una de esas categorías, espera y después ve a este producto como vigente
    alt El producto no estaba dado de baja
        RES-->>A: 422 PRODUCT_NOT_DELETED
    else Ninguna de sus categorías sigue vigente
        RES-->>A: 422 PRODUCT_WITHOUT_CATEGORY
    else Puede volver
        RES->>BD: Guarda el producto activo, con el mismo slug y SKU
    end
    RES->>BD: Lee el detalle
    API-->>A: 200 con el producto
```

---

## Catálogo: imágenes

### 14. Procesado de una imagen

Se dispara con el evento publicado al confirmar el alta, la adición, el reemplazo o el reintento de una imagen. Cada intento se cuenta **antes** de empezar, así uno que nunca termina (por ejemplo, porque se cae el proceso) igual cuenta y, pasado el máximo, la imagen queda en estado fallido. El trabajo sobre los archivos corre fuera de la transacción y el resultado solo se aplica si la imagen sigue siendo la misma pendiente, de modo que correrlo dos veces o junto con una baja o un reemplazo nunca deja un estado incorrecto.

```mermaid
sequenceDiagram
    autonumber
    participant EV as EventPublisher
    participant LIS as ProductImageUploadedListener
    participant UC as ProcessProductImageUseCase
    participant BD as BD
    participant STP as Storage (privado)
    participant SH as Sharp
    participant STU as Storage (público)

    EV->>LIS: ProductImageUploadedEvent(imageId)
    LIS->>UC: execute(imageId)
    UC->>BD: Lee la imagen
    alt No está pendiente
        UC-->>LIS: Omitida
    end
    UC->>BD: Transacción: vuelve a leerla, bloqueada
    alt Ya agotó los intentos
        UC->>BD: La marca como fallida
        UC-->>LIS: Error registrado
    else Quedan intentos
        UC->>BD: Cuenta el intento y guarda
    end
    UC->>STP: Descarga el original
    alt Falla el almacenamiento
        UC->>BD: Deja la imagen pendiente para otro intento
        UC-->>LIS: Error registrado
    end
    UC->>SH: Genera la versión pública (WebP 4:5 de hasta 1200 por 1500, girada según EXIF)
    alt El original no se puede leer o procesar
        UC->>BD: La marca como fallida de inmediato
        UC-->>LIS: Error registrado
    end
    UC->>STU: Sube la versión pública con una clave propia de esta ejecución
    alt Falla la subida
        UC->>BD: Deja la imagen pendiente
        UC-->>LIS: Error registrado
    end
    UC->>BD: Transacción: lee la imagen, bloqueada
    alt Ya no está pendiente o cambió su original
        UC->>STU: Borra la versión que acaba de subir
        UC-->>LIS: Omitida
    else Sigue siendo la misma pendiente
        UC->>BD: La marca como procesada con la clave pública y el tamaño
        opt Tenía una versión pública anterior
            UC->>STU: Borra la versión anterior
        end
        UC-->>LIS: Procesada
    end
    Note over LIS: El listener nunca rechaza: el error se registra y quien publicó sigue con la siguiente imagen
```

### 15. Reprocesado de imágenes demoradas

Una tarea programada recupera las imágenes que se quedaron pendientes más de lo normal, por ejemplo porque un reinicio cortó su procesado. Procesa de a una, empezando por la más antigua y con un lote chico por corrida, para que Sharp nunca decodifique varias a la vez.

```mermaid
sequenceDiagram
    autonumber
    participant CR as Cron (cada 5 minutos y una vez al arrancar la app)
    participant SCH as StaleImagesScheduler
    participant BG as BackgroundTasks
    participant UC as ReprocessStaleImagesUseCase
    participant BD as BD
    participant PR as ProcessProductImageUseCase

    CR->>SCH: Dispara la tarea
    alt Ya hay una corrida en curso o la app se está cerrando
        SCH-->>CR: No hace nada
    end
    SCH->>BG: Encola la corrida
    BG->>UC: execute(debeDetenerse)
    UC->>BD: Busca los ids pendientes hace 10 minutos o más, los más antiguos primero y hasta 20 por corrida
    BD-->>UC: Lista de ids
    loop Cada imagen, una por vez
        alt Se pidió detener
            UC-->>BG: Termina la que estaba en curso y no empieza otra
        end
        UC->>PR: execute(imageId, pendientes desde antes del corte)
        alt Procesada
            PR-->>UC: processed
        else Cambió mientras tanto
            PR-->>UC: skipped
        else Falló
            PR-->>UC: Error, que se acumula y la corrida sigue con la siguiente
        end
    end
    UC-->>SCH: Procesadas, omitidas y fallas
    SCH->>SCH: Registra el resultado y las fallas
```

### 16. Reemplazo del archivo de una imagen

El archivo nuevo se sube con una clave propia (nunca se sobrescribe un archivo) y la versión pública anterior se sigue mostrando hasta que termina el procesado del nuevo original. Agregar una imagen (`POST /admin/products/:id/images`) sigue el mismo esquema: se valida y se sube antes de la transacción, dentro de ella se bloquean el producto y las imágenes para que dos altas simultáneas no superen el límite de 5, y al confirmar se publica el evento de procesado.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant API as ProductImagesController
    participant UC as ReplaceProductImageFileUseCase
    participant BD as BD
    participant STP as Storage (privado)
    participant BG as BackgroundTasks
    participant EV as EventPublisher

    A->>G: PUT /admin/products/:productId/images/:imageId/file (multipart)
    G->>API: Rol ADMIN o SELLER
    API->>UC: execute(productId, imageId, archivo)
    UC->>BD: Lee el producto editable y la imagen
    alt Producto o imagen inexistentes
        UC-->>A: 404 PRODUCT_NOT_FOUND o PRODUCT_IMAGE_NOT_FOUND
    else El producto está dado de baja
        UC-->>A: 422 PRODUCT_DELETED
    end
    UC->>UC: Valida el tamaño (hasta 10 MB) y detecta el formato (JPEG, PNG o WebP) por los bytes
    alt El archivo no es válido
        UC-->>A: 400 INVALID_IMAGE
    end
    UC->>STP: Sube el archivo nuevo con una clave nueva
    alt Falla la subida
        UC->>BG: Encola el borrado de esa clave (pudo haberse guardado)
        UC-->>A: 502 IMAGE_UPLOAD_FAILED
    end
    UC->>BD: Transacción: bloquea el producto y la imagen
    UC->>UC: Reemplaza el original y la imagen vuelve a pendiente
    UC->>BD: Guarda la imagen
    alt Falla el guardado
        UC->>BD: Lee la imagen para saber si igual se confirmó
        Note over UC,BD: Si ya apunta al archivo nuevo, el reemplazo está hecho. Si no, se borra el archivo nuevo
    end
    UC->>BG: Encola el borrado del original reemplazado
    UC->>BG: Encola la publicación de ProductImageUploadedEvent
    BG->>EV: publish(evento)
    Note over EV: El procesado sigue en el diagrama 14
    UC->>BD: Lee la imagen
    UC-->>API: Imagen
    API-->>A: 200 con la imagen (pendiente)
```

### 17. Eliminación de una imagen

Un producto nunca queda sin imágenes. Los archivos se borran recién después de confirmar la transacción, así una eliminación que no ocurre conserva los suyos. Los que el almacenamiento no pudo borrar se devuelven para registrarlos y limpiarlos a mano.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant API as ProductImagesController
    participant UC as DeleteProductImageUseCase
    participant POL as ProductImagePolicy
    participant BD as BD
    participant ST as Storage

    A->>G: DELETE /admin/products/:productId/images/:imageId
    G->>API: Rol ADMIN o SELLER
    API->>UC: execute(productId, imageId)
    UC->>BD: Transacción: bloquea el producto y lee sus imágenes
    alt El producto no existe
        UC-->>A: 404 PRODUCT_NOT_FOUND
    else Está dado de baja
        UC-->>A: 422 PRODUCT_DELETED
    end
    alt La imagen no es de ese producto
        UC-->>A: 404 PRODUCT_IMAGE_NOT_FOUND
    end
    UC->>POL: assertCanRemove(cantidad de imágenes)
    alt Es la última imagen, contando las de cualquier estado
        POL-->>A: 422 LAST_PRODUCT_IMAGE
    end
    UC->>BD: Elimina la imagen
    UC->>POL: Renumera las que quedan desde 1, sin huecos
    UC->>BD: Guarda las posiciones nuevas
    UC->>BD: Confirma la transacción
    UC->>ST: Borra el original y la versión pública, cada uno con un reintento a los 1 segundo
    ST-->>UC: Los archivos que no se pudieron borrar
    UC-->>API: Id eliminado y archivos que quedaron
    API-->>A: 204, y el servidor registra los archivos que quedaron para borrarlos a mano
```

---

## Catálogo: categorías

### 18. Baja de categoría

Dos bajas a la vez podrían dejar a un producto sin su última categoría vigente, así que se ejecutan de a una, bloqueando toda la jerarquía. Crear, mover o reactivar una subcategoría bloquea a su padre, por lo que ninguna aparece entre el conteo y la baja.

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador o vendedor
    participant G as Guards
    participant API as AdminCategoriesController
    participant UC as DeleteCategoryUseCase
    participant POL as CategoryDeletionPolicy
    participant BD as BD

    A->>G: DELETE /admin/categories/:id
    G->>API: Rol ADMIN o SELLER
    API->>UC: execute(categoryId)
    UC->>BD: Transacción: toma el bloqueo de la jerarquía
    UC->>BD: Lee la categoría, bloqueada
    alt No existe
        UC-->>A: 404 CATEGORY_NOT_FOUND
    else Ya estaba dada de baja
        Note over UC,BD: No escribe nada
    else Vigente
        UC->>BD: Cuenta las subcategorías vigentes
        UC->>BD: Cuenta los productos vigentes que la tienen como única categoría
        UC->>POL: assertCanDelete(subcategorías, productos)
        alt Tiene subcategorías vigentes
            POL-->>A: 422 CATEGORY_HAS_ACTIVE_CHILDREN con la cantidad en details
        else Hay productos que quedarían sin categoría vigente
            POL-->>A: 422 CATEGORY_IN_USE con la cantidad en details
        end
        UC->>BD: Guarda la baja con la fecha
    end
    API-->>A: 204
```

---

## Catálogo: tienda pública

Las rutas de la tienda son públicas y de solo lectura. Solo muestran los productos y categorías visibles, es decir vigentes, activos y con una categoría que la tienda muestra. Una oferta o una novedad vencida deja de mostrarse en su fecha de fin aunque el dato siga guardado.

### 19. Listado y búsqueda en el catálogo

```mermaid
sequenceDiagram
    autonumber
    actor C as Visitante
    participant RL as RateLimitGuard
    participant API as CatalogController
    participant UC as SearchCatalogUseCase
    participant Q as CatalogQueries
    participant BD as BD

    C->>RL: GET /products (q, categoría, destacados, novedades, ofertas, stock, precio, orden, página hasta 500)
    RL->>API: Dentro del límite general
    API->>API: Valida y normaliza los parámetros
    API->>UC: execute(consulta)
    UC->>UC: Convierte los precios a dinero
    alt El precio máximo es menor al mínimo
        UC-->>C: 400 INVALID_PRICE_RANGE
    end
    alt Sin texto de búsqueda
        UC->>Q: findPage(filtros, ahora)
    else Con texto
        UC->>UC: Separa el texto en palabras
        alt Todas las palabras son de una sola letra
            UC-->>API: Página vacía, sin consultar la base
        else Hay palabras para buscar
            UC->>Q: findPage(filtros y palabras, ahora)
        end
    end
    Q->>BD: Consulta paginada de productos visibles
    Note over Q,BD: Cada palabra tiene que aparecer en el título, en cualquier orden y en singular o plural. Con orden por relevancia, los títulos que empiezan con el texto van primero. En todos los órdenes, los productos sin stock van después de los que tienen
    BD-->>Q: Productos y total
    Q-->>UC: Página de tarjetas
    UC-->>API: Página
    API-->>C: 200 con items, página, límite, totalItems y totalPages
```

### 20. Ficha de producto

La ficha muestra primero los productos relacionados elegidos a mano y, si no alcanzan el límite, los completa con otros de la misma categoría principal, siempre que la tienda la muestre.

```mermaid
sequenceDiagram
    autonumber
    actor C as Visitante
    participant API as CatalogController
    participant UC as GetProductDetailUseCase
    participant Q as CatalogQueries
    participant BD as BD

    C->>API: GET /products/:slug
    API->>UC: execute(slug)
    alt El texto no puede ser un slug
        UC-->>C: 404 PRODUCT_NOT_FOUND, sin consultar la base
    end
    UC->>Q: findPageBySlug(slug, ahora)
    Q->>BD: Busca el producto visible con sus imágenes y categorías
    alt No existe o no es visible
        UC-->>C: 404 PRODUCT_NOT_FOUND
    end
    UC->>Q: findManualRelated(producto, límite, ahora)
    Q->>BD: Relacionados elegidos a mano que sean visibles
    opt Faltan para llegar al límite y la categoría principal es visible
        UC->>Q: findByPrimaryCategory(categoría, excluidos, ahora)
        Q->>BD: Completa con otros de la misma categoría
    end
    UC-->>API: Ficha con sus relacionados
    API-->>C: 200
```

### 21. Búsqueda global

Es la búsqueda del encabezado de la tienda: devuelve productos por título y categorías por nombre en una sola respuesta, con pocos resultados de cada tipo.

```mermaid
sequenceDiagram
    autonumber
    actor C as Visitante
    participant API as SearchController
    participant UC as GlobalSearchUseCase
    participant CQ as CatalogQueries
    participant KQ as CategoryQueries
    participant BD as BD

    C->>API: GET /search?q=...&limit=5
    API->>API: Valida el largo del texto y el límite
    API->>UC: execute(q, limit)
    UC->>UC: Separa el texto en palabras
    alt Sin palabras para buscar
        UC-->>API: Productos y categorías vacíos
    else Hay palabras
        par Productos
            UC->>CQ: searchCards(palabras, texto, límite, ahora)
            CQ->>BD: Productos visibles cuyo título tiene todas las palabras
        and Categorías
            UC->>KQ: searchVisible(palabras, texto, límite)
            KQ->>BD: Categorías visibles cuyo nombre tiene todas las palabras
        end
        Note over CQ,KQ: En ambos, los que empiezan con el texto buscado van primero
        UC-->>API: Productos y categorías
    end
    API-->>C: 200
```

---

## Catálogo: tareas programadas

### 22. Limpieza de ofertas y novedades vencidas

La tienda ya deja de mostrar una oferta o una novedad en su fecha de fin. Esta tarea hace que el dato guardado, y lo que ve el panel, coincida con eso. Es idempotente: lo que ya se limpió no se encuentra de nuevo.

```mermaid
sequenceDiagram
    autonumber
    participant CR as Cron (todos los días a medianoche, hora de Argentina)
    participant SCH as ProductMarksExpiryScheduler
    participant BG as BackgroundTasks
    participant UC as ExpireProductMarksUseCase
    participant BD as BD

    CR->>SCH: Dispara la tarea
    SCH->>BG: Encola la ejecución
    BG->>UC: execute()
    UC->>BD: Quita el precio de oferta y la marca de oferta de los productos cuya oferta ya terminó
    UC->>BD: Quita la marca de novedad de los productos cuya fecha de novedad ya pasó
    BD-->>UC: Cantidad de ofertas y novedades limpiadas
    UC-->>SCH: Resultado
    SCH->>SCH: Registra el resultado
```
