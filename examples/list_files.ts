import { Configuration, DefaultApi } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
const id = process.env.REVDOKU_BUCKET_ID;
if (!key || !id) throw new Error("Set REVDOKU_API_KEY and REVDOKU_BUCKET_ID");
const api = new DefaultApi(new Configuration({ accessToken: key }));
let offset = 0;
for (;;) {
  const { data: page } = await api.listBucketFiles({
    id,
    limit: 100,
    offset,
    accountId: process.env.REVDOKU_ACCOUNT_ID || undefined,
  });
  for (const file of page.files) console.log(JSON.stringify(file));
  if (!page.pagination.hasMore) break;
  const next = page.pagination.nextOffset;
  if (next == null || next <= offset)
    throw new Error("File pagination did not advance");
  offset = next;
}
