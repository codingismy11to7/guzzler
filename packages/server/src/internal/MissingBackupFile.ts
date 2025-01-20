import { Data } from "effect";

export class MissingBackupFile extends Data.TaggedError("MissingBackupFile")<{
  fileName: string;
}> {
  get message() {
    return `Missing expected backup file '${this.fileName}'`;
  }
}
