import { PhotoId, VehicleId } from "@guzzler/domain/models/Autos";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { Chunk, Option } from "effect";
import { LazyArg } from "effect/Function";
import { ReactNode } from "react";
import { useUserData } from "../hooks/useUserData.js";
import { AppRoute, routes } from "../router.js";
import { AppLink } from "./AppLink.js";
import { VehicleAvatar } from "./VehicleAvatar.js";

type VehicleListItemProps = Readonly<{
  displayName?: ReactNode;
  stringName?: string;
  imageId?: Option.Option<PhotoId>;
  route?: AppRoute;
  onClick?: LazyArg<void>;
}>;
const VehicleListItem = ({
  displayName,
  stringName,
  imageId,
  route,
  onClick,
}: VehicleListItemProps) => (
  <ListItem disablePadding>
    <ListItemButton
      {...(onClick ? { onClick } : !route ? {} : { component: AppLink, route })}
    >
      <ListItemAvatar>
        <VehicleAvatar name={stringName} imageId={imageId} />
      </ListItemAvatar>
      <ListItemText primary={displayName ?? <Skeleton />} />
    </ListItemButton>
  </ListItem>
);

type Props =
  | Readonly<{ routeForVehicle: (vehicleId: VehicleId) => AppRoute }>
  | Readonly<{ onVehicleClick: (vehicleId: VehicleId) => void }>;

export const VehicleList = (props: Props) => {
  const userData = useUserData();

  return (
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
                {...("routeForVehicle" in props
                  ? { route: props.routeForVehicle(v.id) }
                  : { onClick: () => props.onVehicleClick(v.id) })}
                route={routes.Vehicle({ vehicleId: v.id })}
              />
            ))}
    </List>
  );
};
