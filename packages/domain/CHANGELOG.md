# @guzzler/domain

## 0.0.5

### Patch Changes

- [#73](https://github.com/codingismy11to7/guzzler/pull/73) [`d763137`](https://github.com/codingismy11to7/guzzler/commit/d763137cde3a466640f2f7bdc3bd125aa3f46946) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - refactor security middlewares, add delete account

- [#76](https://github.com/codingismy11to7/guzzler/pull/76) [`0508106`](https://github.com/codingismy11to7/guzzler/commit/0508106a7513465adab70c8e4baf0c3b3da139b4) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add a skeleton to main page

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

- [#74](https://github.com/codingismy11to7/guzzler/pull/74) [`332e482`](https://github.com/codingismy11to7/guzzler/commit/332e482b31189dd77d483e163e24896826df8ada) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - rework login and create account flow

- [#102](https://github.com/codingismy11to7/guzzler/pull/102) [`be75036`](https://github.com/codingismy11to7/guzzler/commit/be75036054e7b632fc83b7e08cbf351a248c9843) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - set up json file linting (#70)

- [#66](https://github.com/codingismy11to7/guzzler/pull/66) [`aa3a061`](https://github.com/codingismy11to7/guzzler/commit/aa3a061fafc3c52de8f32899fb5c7a8e5507d84c) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add support for accounts/users

- [#72](https://github.com/codingismy11to7/guzzler/pull/72) [`5084ad0`](https://github.com/codingismy11to7/guzzler/commit/5084ad0b0662986939320d4d1cc38b0c01318d69) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - bootstrap frontend with mui, type-router, and i18next

## 0.0.4

### Patch Changes

- [#57](https://github.com/codingismy11to7/guzzler/pull/57) [`187adff`](https://github.com/codingismy11to7/guzzler/commit/187adff383e58c7cf7670334613d7523c5708e8d) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - temporarily persist todos, fix some bugs

## 0.0.3

### Patch Changes

- [#56](https://github.com/codingismy11to7/guzzler/pull/56) [`3b5a517`](https://github.com/codingismy11to7/guzzler/commit/3b5a51750b1521ac8f58cac85bae8739d6c30150) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - persist sessions in db

## 0.0.2

### Patch Changes

- [#38](https://github.com/codingismy11to7/guzzler/pull/38) [`b017ca2`](https://github.com/codingismy11to7/guzzler/commit/b017ca23bf8feb4cb933cca7836f4e82e7635d01) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - add google oauth2

## 0.0.1

### Patch Changes

- [#36](https://github.com/codingismy11to7/guzzler/pull/36) [`d0abfc8`](https://github.com/codingismy11to7/guzzler/commit/d0abfc8c7dc0c34a5e7b387fe447b437041118de) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - playing with http and schemas and effect's new magic

  putting a second line here to see what happens

- [#37](https://github.com/codingismy11to7/guzzler/pull/37) [`6a642dd`](https://github.com/codingismy11to7/guzzler/commit/6a642dd4d62bbd414b1d1c055f9cc0eb28042207) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - got things running e2e in both dev and production (docker)

- [#1](https://github.com/codingismy11to7/guzzler/pull/1) [`96bb2bb`](https://github.com/codingismy11to7/guzzler/commit/96bb2bbad2a09fade02a138cf97a81f7c2c1aa9c) Thanks [@codingismy11to7](https://github.com/codingismy11to7)! - test of the changeset functionality
