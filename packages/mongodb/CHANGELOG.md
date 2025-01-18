# @guzzler/mongodb

## 0.0.3

### Patch Changes

- [#73](https://github.com/codingismy11to7/guzzler/pull/73) [`d763137`](https://github.com/codingismy11to7/guzzler/commit/d763137cde3a466640f2f7bdc3bd125aa3f46946) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - refactor security middlewares, add delete account

- [#107](https://github.com/codingismy11to7/guzzler/pull/107) [`9b19f90`](https://github.com/codingismy11to7/guzzler/commit/9b19f902fc4bd7feb5494c8e1eeb4a844e5adb32) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add support for mongo transactions

- [#107](https://github.com/codingismy11to7/guzzler/pull/107) [`9b19f90`](https://github.com/codingismy11to7/guzzler/commit/9b19f902fc4bd7feb5494c8e1eeb4a844e5adb32) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add acar backup import support

  this was massive, added both frontend and backend support

  - added a new Zip service that handles streaming from zip files
  - added support for mongo transactions by nesting an optional transaction
    context through the R requirements channel
  - added support for mongo GridFS
  - added a super low-level XML service that is the thinnest effect layer over
    node-expat which is the thinnest layer over libexpat. would not have done
    this had aCar not embedded photos as base64 strings in xml 😿
  - implemented a TimeZone schema before i realized effect already has one.
    mine hardcodes the available ones into the type, though. which...i guess
    isn't useful. sigh
    - [#106 - switch out custom timezone](https://github.com/codingismy11to7/guzzler/issues/106)
  - discovered the Scalar ui as an alternative to swagger-ui. like it
    - (i did not discover it, i discovered the code in the effect lib)
  - came up with a schema for storing user data (some of it at least, have
    more to flesh out, like settings.) it's not really anything at this moment
    besides aCar's format, with some improvements and some unknown junk data that
    i'll try to figure out later
  - did all the crud for that
  - did the ui for importing the backup

- [#102](https://github.com/codingismy11to7/guzzler/pull/102) [`be75036`](https://github.com/codingismy11to7/guzzler/commit/be75036054e7b632fc83b7e08cbf351a248c9843) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - set up json file linting (#70)

- [#66](https://github.com/codingismy11to7/guzzler/pull/66) [`aa3a061`](https://github.com/codingismy11to7/guzzler/commit/aa3a061fafc3c52de8f32899fb5c7a8e5507d84c) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add support for accounts/users

- [#72](https://github.com/codingismy11to7/guzzler/pull/72) [`5084ad0`](https://github.com/codingismy11to7/guzzler/commit/5084ad0b0662986939320d4d1cc38b0c01318d69) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - bootstrap frontend with mui, type-router, and i18next

- Updated dependencies [[`be75036`](https://github.com/codingismy11to7/guzzler/commit/be75036054e7b632fc83b7e08cbf351a248c9843), [`aa3a061`](https://github.com/codingismy11to7/guzzler/commit/aa3a061fafc3c52de8f32899fb5c7a8e5507d84c)]:
  - @guzzler/utils@0.0.2

## 0.0.2

### Patch Changes

- [#57](https://github.com/codingismy11to7/guzzler/pull/57) [`187adff`](https://github.com/codingismy11to7/guzzler/commit/187adff383e58c7cf7670334613d7523c5708e8d) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - temporarily persist todos, fix some bugs

## 0.0.1

### Patch Changes

- [#56](https://github.com/codingismy11to7/guzzler/pull/56) [`3b5a517`](https://github.com/codingismy11to7/guzzler/commit/3b5a51750b1521ac8f58cac85bae8739d6c30150) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - persist sessions in db

- [#52](https://github.com/codingismy11to7/guzzler/pull/52) [`cf28ce9`](https://github.com/codingismy11to7/guzzler/commit/cf28ce904d7920bb0405677251a5ca55feedd7dc) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - support \*\_FILE env vars for secrets

- [#50](https://github.com/codingismy11to7/guzzler/pull/50) [`5a70628`](https://github.com/codingismy11to7/guzzler/commit/5a7062851272c0f25fe3fadd1e890ae314f15b67) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add mongo support

- Updated dependencies [[`3b5a517`](https://github.com/codingismy11to7/guzzler/commit/3b5a51750b1521ac8f58cac85bae8739d6c30150), [`cf28ce9`](https://github.com/codingismy11to7/guzzler/commit/cf28ce904d7920bb0405677251a5ca55feedd7dc), [`5a70628`](https://github.com/codingismy11to7/guzzler/commit/5a7062851272c0f25fe3fadd1e890ae314f15b67)]:
  - @guzzler/utils@0.0.1
