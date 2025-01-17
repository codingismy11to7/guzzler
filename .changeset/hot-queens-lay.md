---
"@guzzler/mongodb": patch
"@guzzler/domain": patch
"@guzzler/server": patch
"@guzzler/webui": patch
---

add acar backup import support

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
