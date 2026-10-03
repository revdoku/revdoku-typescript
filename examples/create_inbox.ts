import { Configuration, DefaultApi } from "@revdoku/api";

const key = process.env.REVDOKU_API_KEY;
if (!key) throw new Error("Set REVDOKU_API_KEY");
const api = new DefaultApi(new Configuration({ accessToken: key }));
const result = await api.createBucket({
  createBucketRequest: {
    accountId: process.env.REVDOKU_ACCOUNT_ID || undefined,
    bucket: { title: "Example inbox" },
  },
});
console.log(result.data.bucket?.id, result.data.bucket?.email?.address);
// A timeout or EMAIL_NOT_READY can leave a bucket. Inspect it before retrying.
