## First request

Set `REVDOKU_API_KEY` in your environment, then run this in Node.js:

```javascript
import { Configuration, DefaultApi } from '@revdoku/api';
const api = new DefaultApi(new Configuration({ accessToken: process.env.REVDOKU_API_KEY }));
const result = await api.getAccountLimits({ accountId: process.env.REVDOKU_ACCOUNT_ID });
console.log(result.data);
```

Base URL: `https://api.revdoku.com`; generated paths include `/v1`. Keep your bearer API key in private configuration.
`REVDOKU_ACCOUNT_ID` is optional and selects an account granted to the key; otherwise its default account applies.
Read resource results from the API's `data` envelope, such as `data.email`, `data.bucket` or `data.limits`.

[Four runnable examples and source setup](examples/README.md) · [API reference](https://revdoku.com/api.md)
