# posthaste

A rapid deployment utility for Azure inspired by [now](https://zeit.co/now).

## Information

**posthaste** is a small command line utility written in node.js that allows the user to quickly deploy web apps to Azure..

### Build and Install

From NPM:
```bash
npm install -g posthaste
```

From repo:
```bash
npm build
npm install -g
```

### Testing

Tests do not exist yet.

```bash
npm test
```

### Compatibility

Node v7.8.0+.

At this time, you can automatically deploy:
* Static web apps.
* .NET web apps.
* Node web apps (coming soon).

### Examples

#### Local

The basic usage is to deploy from your current directory.
```bash
$ cd myWebApp
$ posthaste
```

Or, you can pass the directory.
```bash
$ posthaste myWebApp
```

You can give your app a different name with `-n`.
```bash
$ cd myWebApp
$ posthaste -n MySpecialName
```

You can list web apps, set subscriptions, etc. with other commands.  View them with `posthaste -h`

## License

```
The MIT License (MIT)

Copyright (c) 2016 Aaron Roney

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```