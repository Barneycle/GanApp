export async function runOptimistic({ apply, request, revert }) {
  apply();
  try {
    const result = await request();
    if (result && result.error) {
      revert();
      return result;
    }
    return result || { ok: true };
  } catch (error) {
    revert();
    return { error: error?.message || 'Something went wrong' };
  }
}
