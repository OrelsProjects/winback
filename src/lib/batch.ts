async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export { delay };

export function batch<T>(items: T[], batchSize: number) {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export async function runInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
  options?: {
    onError?: (error: Error, data: T) => void;
    onBatchComplete?: (completedCount: number, total: number) => Promise<void>;
    onBatchStart?: (data: T[]) => void;
    printProgress?: boolean;
    printProgressPrefix?: string;
    delayBetweenBatchesMs?: number;
    skip?: number;
  },
) {
  const {
    printProgress = false,
    printProgressPrefix = "",
    delayBetweenBatchesMs = 0,
    skip = 0,
    onBatchComplete,
    onBatchStart,
  } = options || {};
  let index = skip;
  const batches = batch(items, batchSize);
  let completedCount = batches
    .slice(0, skip)
    .reduce((sum, b) => sum + b.length, 0);
  const total = items.length;
  try {
    const results: R[] = [];

    for (const batchItems of batches.slice(skip)) {
      onBatchStart?.(batchItems);
      if (printProgress) {
        console.log(
          `${printProgressPrefix} Processing batch ${index + 1} of ${
            batches.length
          }`,
        );
      }
      index++;
      const promises = batchItems.map(item => fn(item));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      completedCount += batchItems.length;
      await onBatchComplete?.(completedCount, total);
      if (delayBetweenBatchesMs) {
        await delay(delayBetweenBatchesMs);
      }
    }
    return results;
  } catch (error) {
    if (options?.onError) {
      options.onError(error as Error, items[index - 1]);
    } else {
      throw error;
    }
  }
}
