export const promiseAllWithConcurrency = async <T>(
  promises: Promise<T>[],
  concurrency: number,
) => {
  const results: T[] = [];
  let index = 0;
  await Promise.all(
    Array.from({ length: concurrency }).map(async () => {
      while (true) {
        const currentIndex = index++;
        const task = promises[currentIndex];
        if (!task) return;
        results[currentIndex] = await task;
      }
    }),
  );
  return results;
};
