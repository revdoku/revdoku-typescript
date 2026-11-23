import { Revdoku } from 'revdoku';

// Reads REVDOKU_API_KEY. REVDOKU_ACCOUNT_ID is optional.
const client = new Revdoku({ accountId: process.env.REVDOKU_ACCOUNT_ID || undefined });
let cursor: string | undefined;
const seen = new Set<string>();
for (;;) {
  const { data: page } = await client.listProjects({ status: 'active', limit: 100, cursor });
  for (const project of page.projects) console.log(project.id, project.email?.address || project.id);
  if (!page.pagination.hasMore) break;
  cursor = page.pagination.nextCursor ?? undefined;
  if (!cursor || seen.has(cursor)) throw new Error('Project pagination did not advance');
  seen.add(cursor);
}
