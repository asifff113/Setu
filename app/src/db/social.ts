import { db, type CircleRow } from './schema';

export async function circleMembers(): Promise<CircleRow[]> {
  return db.circles.orderBy('addedAt').toArray();
}

export async function addCircleMember(au: string, name: string): Promise<CircleRow> {
  const row: CircleRow = {
    au,
    name: name.trim().slice(0, 32) || 'Circle member',
    addedAt: Math.floor(Date.now() / 1000),
  };
  await db.circles.put(row);
  return row;
}

export async function removeCircleMember(au: string): Promise<void> {
  await db.circles.delete(au);
}
