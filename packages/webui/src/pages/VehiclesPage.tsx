import { PhotoId } from "@guzzler/domain/Autos";
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { Chunk, Option } from "effect";
import { isNotNullable, isNotUndefined } from "effect/Predicate";
import { ReactNode } from "react";
import { imageUrl } from "../apiclients/ImageClient.js";
import { AppLink } from "../components/AppLink.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { useUserData } from "../hooks/useUserData.js";
import { AppRoute, routes } from "../router.js";

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

type VehicleListItemProps = Readonly<{
  displayName?: ReactNode;
  stringName?: string;
  imageId?: Option.Option<PhotoId>;
  route?: AppRoute;
}>;
const VehicleListItem = ({
  displayName,
  stringName,
  imageId,
  route,
}: VehicleListItemProps) => (
  <ListItem disablePadding>
    <ListItemButton {...(!route ? {} : { component: AppLink, route })}>
      <ListItemAvatar>
        {!stringName ? (
          <Skeleton variant="circular">
            <Avatar />
          </Skeleton>
        ) : isNotUndefined(imageId) && Option.isSome(imageId) ? (
          <Avatar alt={stringName} src={imageUrl(imageId)} />
        ) : (
          <StringAvatar s={stringName} />
        )}
      </ListItemAvatar>
      <ListItemText primary={displayName ?? <Skeleton />} />
    </ListItemButton>
  </ListItem>
);

const VehiclesPage = () => {
  const userData = useUserData();

  return (
    <StandardPageBox>
      <List>
        {userData.loading
          ? Chunk.makeBy(10, i => <VehicleListItem key={i} />)
          : Object.values(userData.vehicles)
              /*
              .filter(v => v.active)
*/
              .map(v => (
                <VehicleListItem
                  key={v.id}
                  stringName={v.name}
                  displayName={v.name}
                  imageId={v.photoId}
                  route={routes.Vehicle({ vehicleId: v.id })}
                />
              ))}
      </List>
    </StandardPageBox>
  );
};

export default VehiclesPage;
