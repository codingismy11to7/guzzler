import { FuelType, UserTypes } from "@guzzlerapp/domain/Autos";
import { LocalGasStationTwoTone } from "@mui/icons-material";
import {
  AppBar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Skeleton,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { Array, Chunk, Option, Order, pipe, String } from "effect";
import { stringifyCircular } from "effect/Inspectable";
import { PropsWithChildren, ReactNode, useState } from "react";
import { StandardPageBox } from "../components/StandardPageBox.js";
import { useUserData } from "../hooks/useUserData.js";
import { useTranslation } from "../i18n.js";

type FuelListItemProps = Readonly<{
  name: ReactNode;
  loading?: boolean;
  rating?: Readonly<{ type: ReactNode; rating: ReactNode }> | undefined;
}>;
const FuelListItem = ({ name, loading, rating }: FuelListItemProps) => (
  <ListItem>
    <ListItemIcon>
      {loading ? (
        <Skeleton width={24} height={24} variant="rounded" />
      ) : (
        <LocalGasStationTwoTone color="primary" />
      )}
    </ListItemIcon>
    <ListItemText
      primary={name}
      secondary={
        rating ? (
          <Stack direction="row" spacing={0.5} component="span">
            <span>{rating.type}</span>
            <span>{rating.rating}</span>
          </Stack>
        ) : undefined
      }
    />
  </ListItem>
);

const getRating = (f: FuelType) =>
  Option.gen(function* () {
    const type = yield* f.ratingType;
    const rating = (yield* Option.fromNullable(f.rating)).toString();
    return { type, rating };
  }).pipe(Option.getOrUndefined);

const FuelsList = () => {
  const userData = useUserData();

  const makeListItems = (fts: UserTypes["fuelTypes"]) => {
    const map = pipe(
      Object.values(fts),
      Array.sortWith(ft => ft.name.toLowerCase(), Order.string),
      Array.groupBy(ft => ft.category),
    );

    return Array.sortWith(
      Object.entries(map),
      ([cat]) => cat,
      Order.string,
    ).map(([cat, fts]) => (
      <li key={`section-${cat}`}>
        <ul>
          <ListSubheader key={`section-${cat}-subhead`}>
            {String.capitalize(cat)}
          </ListSubheader>
          {fts.map(ft => (
            <FuelListItem
              key={`item-${cat}-${ft.id}`}
              name={ft.name}
              rating={getRating(ft)}
            />
          ))}
        </ul>
      </li>
    ));
  };

  return (
    <List
      role="tabpanel"
      id="full-width-tabpanel-fuels"
      aria-labelledby="full-width-tab-fuels"
      sx={{
        height: 1,
        overflow: "auto",
        position: "relative",
        pb: 4,
        "& ul": { padding: 0 },
      }}
      subheader={<li />}
    >
      {userData.loading ? (
        <li>
          {Chunk.makeBy(3, i => (
            <ul>
              <ListSubheader key={`subhead-${i}`}>
                <Skeleton />
              </ListSubheader>
              {Chunk.makeBy(5, i => (
                <FuelListItem
                  loading
                  key={i}
                  name={<Skeleton />}
                  rating={{ rating: <Skeleton />, type: <Skeleton /> }}
                />
              ))}
            </ul>
          ))}
        </li>
      ) : (
        makeListItems(userData.types.fuelTypes)
      )}
    </List>
  );
};

type Tab = "fuels" | "events" | "trips";

type TabPanelProps = Readonly<{ tab: Tab }> & PropsWithChildren;

const TabPanel = ({ tab, children, ...rest }: TabPanelProps) => (
  <StandardPageBox
    role="tabpanel"
    id={`full-width-tabpanel-${tab}`}
    aria-labelledby={`full-width-tab-${tab}`}
    {...rest}
  >
    {children}
  </StandardPageBox>
);

const a11yProps = (tab: Tab) => ({
  id: `full-width-tab-${tab}`,
  "aria-controls": `full-width-tabpanel-${tab}`,
});

const CategoryManagement = () => {
  const { t } = useTranslation();

  const userData = useUserData();

  const [tab, setTab] = useState<Tab>("fuels");

  return (
    <>
      <AppBar position="static">
        <Tabs
          value={tab}
          onChange={(_, tab) => setTab(tab as Tab)}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
          aria-label="tab navigation"
        >
          <Tab
            label={t("categoryManagement.fuels")}
            value="fuels"
            {...a11yProps("fuels")}
          />
          <Tab
            label={t("categoryManagement.events")}
            value="events"
            {...a11yProps("events")}
          />
          <Tab
            label={t("categoryManagement.trips")}
            value="trips"
            {...a11yProps("trips")}
          />
        </Tabs>
      </AppBar>
      {tab === "fuels" && <FuelsList />}
      {tab === "events" && (
        <TabPanel tab="events">
          {userData.loading ? (
            <Skeleton />
          ) : (
            stringifyCircular(userData.types.eventSubtypes, 2)
          )}
        </TabPanel>
      )}
      {tab === "trips" && (
        <TabPanel tab="trips">
          {userData.loading ? (
            <Skeleton />
          ) : (
            stringifyCircular(userData.types.tripTypes, 2)
          )}
        </TabPanel>
      )}
    </>
  );
};

export default CategoryManagement;
