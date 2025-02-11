import { PhotoId } from "@guzzlerapp/domain/models/Autos";
import { Avatar, Skeleton } from "@mui/material";
import { Option } from "effect";
import { isNotNullable, isNotUndefined } from "effect/Predicate";
import { imageUrl } from "../apiclients/ImageClient.js";

const stringToColor = (string: string) => {
  let hash = 0;
  let i;

  /* eslint-disable no-bitwise */
  for (i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";

  for (i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  /* eslint-enable no-bitwise */

  return color;
};

const StringAvatar = ({ s }: Readonly<{ s: string }>) => (
  <Avatar sx={{ bgcolor: stringToColor(s) }}>
    {s
      .split(" ", 2)
      .map(s => s[0])
      .filter(isNotNullable)
      .join("")}
  </Avatar>
);

type Props = Readonly<{
  name?: string | undefined;
  imageId?: Option.Option<PhotoId> | undefined;
}>;

export const VehicleAvatar = ({ name, imageId }: Props) =>
  !name ? (
    <Skeleton variant="circular">
      <Avatar />
    </Skeleton>
  ) : isNotUndefined(imageId) && Option.isSome(imageId) ? (
    <Avatar alt={name} src={imageUrl(imageId)} />
  ) : (
    <StringAvatar s={name} />
  );
