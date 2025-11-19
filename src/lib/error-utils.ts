export function isPrismaUnavailable(err: unknown): boolean {
  try {
    if (!err || typeof err !== 'object') return false;
    const e = err as { name?: string; message?: string };
    const msg = e.message || '';
    const name = e.name || '';

    return (
      name.includes('PrismaClientInitializationError') ||
      msg.includes("Can't reach database server") ||
      msg.includes('PrismaClientInitializationError')
    );
  } catch {
    return false;
  }
}

export default isPrismaUnavailable;
