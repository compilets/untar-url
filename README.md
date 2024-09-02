# untar-url

Untar remote or local .tar/.tar.gz file to local disk.

## Import

```js
import {untar} from '@compilets/untar-url';
```

## API

```ts
interface UntarOptions {
    filter?: (fileName: string) => boolean;
}
export declare function untar(url: string, targetDir: string, options?: UntarOptions): Promise<void>;
```

## Example

```ts
import {untar} from '@compilets/untar-url';

await untar('https://some.tar.gz', '/tmp/mytar');
```

## CLI

```sh
npx @compilets/untar-url https://some.tar.gz /tmp/mytar
```
