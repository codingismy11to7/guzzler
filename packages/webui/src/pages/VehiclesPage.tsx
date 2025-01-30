import { PhotoId } from "@guzzlerapp/domain/Autos";
import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Skeleton,
} from "@mui/material";
import { Chunk, Option } from "effect";
import { ReactNode } from "react";
import { AppLink } from "../components/AppLink.js";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { VehicleAvatar } from "../components/VehicleAvatar.js";
import { useUserData } from "../hooks/useUserData.js";
import { AppRoute, routes } from "../router.js";

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
        <VehicleAvatar name={stringName} imageId={imageId} />
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
