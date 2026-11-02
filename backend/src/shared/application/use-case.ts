/** Common shape of every use case: a single operation with one input and one output. */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
