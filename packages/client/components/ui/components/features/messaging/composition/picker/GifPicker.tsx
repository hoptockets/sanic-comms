import {
  For,
  Match,
  Suspense,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  useContext,
} from "solid-js";

import { useQuery } from "@tanstack/solid-query";
import { styled } from "styled-system/jsx";

import { useClient } from "@revolt/client";
import env from "@revolt/common/lib/env";
import {
  CircularProgress,
  TextField,
  typography,
} from "@revolt/ui/components/design";

import { CompositionMediaPickerContext } from "./CompositionMediaPicker";

type GifCategory = { title: string; image: string };

type GifResult = {
  url: string;
  sendUrl: string;
  mediaUrl: string;
  previewUrl: string;
  title: string;
};

type GiphyGif = {
  url?: string;
  title?: string;
  images?: {
    original?: { mp4?: string; url?: string };
    downsized_small?: { mp4?: string };
    preview?: { mp4?: string };
    fixed_width?: { url?: string };
    fixed_width_still?: { url?: string };
    downsized_medium?: { url?: string };
  };
};

const GIPHY_API_BASE_URL = "https://api.giphy.com/v1";
const FAVOURITES_STORAGE_KEY = "dotcomms.gif.favourites.v1";
const GIF_TILE_WIDTH = 186;
const GIF_TILE_HEIGHT = 112;

async function parseJsonSafe(response: Response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function useGiphy() {
  return Boolean(env.GIPHY_API_KEY?.trim());
}

function getGiphyMp4(gif: GiphyGif) {
  return (
    gif.images?.downsized_small?.mp4 ??
    gif.images?.preview?.mp4 ??
    gif.images?.original?.mp4 ??
    ""
  );
}

function getGiphyImage(gif: GiphyGif) {
  return (
    gif.images?.fixed_width?.url ??
    gif.images?.downsized_medium?.url ??
    gif.images?.fixed_width_still?.url ??
    ""
  );
}

function getGiphyTitle(gif: GiphyGif, fallback = "GIF") {
  const raw = (gif.title ?? "").trim();
  if (!raw) return fallback;
  const cleaned = raw.replace(/\s*-\s*GIF by.*$/i, "").trim();
  return cleaned || fallback;
}

function mapGiphyToGifResult(gif: GiphyGif): GifResult | null {
  const mp4 = getGiphyMp4(gif);
  const preview = getGiphyImage(gif);
  const pageUrl = (gif.url ?? "").trim();
  const sendUrl =
    gif.images?.original?.url ??
    gif.images?.downsized_medium?.url ??
    gif.images?.fixed_width?.url ??
    gif.images?.downsized_small?.mp4 ??
    gif.images?.preview?.mp4 ??
    pageUrl;
  if (!mp4 || !sendUrl || !preview) return null;
  return {
    url: pageUrl || sendUrl,
    sendUrl,
    mediaUrl: mp4,
    previewUrl: preview,
    title: getGiphyTitle(gif),
  };
}

function mapGifboxToGifResult(gif: unknown): GifResult | null {
  if (typeof gif !== "object" || !gif) return null;

  const record = gif as {
    url?: string;
    media_formats?: Record<string, { url?: string }>;
  };

  const url = (record.url ?? "").trim();
  const formats = record.media_formats ?? {};
  const mediaUrl =
    formats.tinywebm?.url ??
    formats.webm?.url ??
    formats.tinygif?.url ??
    formats.nanogif?.url ??
    formats.gif?.url ??
    "";
  const previewUrl =
    formats.tinygif?.url ??
    formats.nanogif?.url ??
    formats.gif?.url ??
    mediaUrl;

  if (!url || !mediaUrl || !previewUrl) return null;

  return {
    url,
    sendUrl: url,
    mediaUrl,
    previewUrl,
    title: "GIF",
  };
}

function mapGifboxCategory(category: unknown): GifCategory | null {
  if (typeof category !== "object" || !category) return null;
  const record = category as { title?: string; image?: string };
  if (typeof record.title !== "string" || typeof record.image !== "string") {
    return null;
  }
  if (!record.image.trim()) return null;
  return { title: record.title, image: record.image };
}

function mapStoredGifResult(gif: unknown): GifResult | null {
  if (typeof gif !== "object" || !gif) return null;
  const record = gif as Partial<GifResult>;
  if (
    typeof record.url !== "string" ||
    typeof record.mediaUrl !== "string" ||
    typeof record.previewUrl !== "string" ||
    typeof record.title !== "string"
  ) {
    return null;
  }
  return {
    url: record.url,
    sendUrl:
      typeof record.sendUrl === "string" && record.sendUrl.length > 0
        ? record.sendUrl
        : record.url,
    mediaUrl: record.mediaUrl,
    previewUrl: record.previewUrl,
    title: record.title,
  };
}

function loadFavourites(): GifResult[] {
  try {
    const raw = localStorage.getItem(FAVOURITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((gif) => mapStoredGifResult(gif))
      .filter((gif): gif is GifResult => gif !== null);
  } catch {
    return [];
  }
}

function saveFavourites(favourites: GifResult[]) {
  try {
    localStorage.setItem(FAVOURITES_STORAGE_KEY, JSON.stringify(favourites));
  } catch {
    // Ignore storage failures (private mode / quota).
  }
}

export function GifPicker() {
  const [filter, setFilter] = createSignal("");
  const [showFavourites, setShowFavourites] = createSignal(false);
  const [favourites, setFavourites] = createSignal<GifResult[]>(loadFavourites());
  const favouriteUrls = createMemo(
    () => new Set(favourites().map((gif) => gif.url)),
  );

  const filterLowercase = () => filter().trim().toLowerCase();

  createEffect(() => {
    saveFavourites(favourites());
  });

  const toggleFavourite = (gif: GifResult) => {
    setFavourites((current) => {
      if (current.some((item) => item.url === gif.url)) {
        return current.filter((item) => item.url !== gif.url);
      }
      return [gif, ...current].slice(0, 100);
    });
  };

  return (
    <Stack>
      <TextField
        autoFocus
        variant="filled"
        placeholder="Search for GIFs..."
        value={filter()}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }}
        onChange={(e) => {
          setFilter(e.currentTarget.value);
          setShowFavourites(false);
        }}
      />
      <Suspense fallback={<CircularProgress />}>
        <Switch
          fallback={
            <Categories
              onSelectFilter={setFilter}
              onOpenFavourites={() => {
                setFilter("");
                setShowFavourites(true);
              }}
              favourites={favourites()}
            />
          }
        >
          <Match when={showFavourites()}>
            <GifGrid items={favourites()} favouriteUrls={favouriteUrls()} onToggleFavourite={toggleFavourite} />
          </Match>
          <Match when={filterLowercase()}>
            <GifSearch
              query={filterLowercase()}
              favouriteUrls={favouriteUrls()}
              onToggleFavourite={toggleFavourite}
            />
          </Match>
        </Switch>
      </Suspense>
    </Stack>
  );
}

const Stack = styled("div", {
  base: {
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    paddingInline: "8px",
    paddingBottom: "8px",
  },
});

type CategoryItem =
  | {
      /**
       * Category entry
       */
      t: 0;
      category: GifCategory;
    }
  | {
      /**
       * Trending entry
       */
      t: 1;
      gif: GifResult | null;
    }
  | {
      /**
       * Favourites entry
       */
      t: 2;
      gif: GifResult;
    };

function Categories(props: {
  onSelectFilter: (value: string) => void;
  onOpenFavourites: () => void;
  favourites: GifResult[];
}) {
  const client = useClient();

  const trendingCategories = useQuery<GifCategory[]>(() => ({
    queryKey: ["trendingGifCategories"],
    queryFn: async () => {
      try {
        if (useGiphy()) {
          const response = await fetch(
            `${GIPHY_API_BASE_URL}/gifs/trending?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&limit=24&rating=pg-13`,
          );
          const payload = await parseJsonSafe(response);
          const gifs = Array.isArray(payload?.data) ? payload.data : [];
          return gifs
            .map((gif: GiphyGif, index: number) => ({
              title: getGiphyTitle(gif, `Trending ${index + 1}`),
              image: getGiphyImage(gif),
            }))
            .filter((entry: GifCategory) => Boolean(entry.image));
        }

        const [authHeader, authHeaderValue] = client()!.authenticationHeader;
        const response = await fetch(
          `${env.DEFAULT_GIFBOX_URL}/categories?locale=en_US`,
          {
            headers: {
              [authHeader]: authHeaderValue,
            },
          },
        );
        const payload = await parseJsonSafe(response);
        if (!Array.isArray(payload)) return [];
        return payload
          .map((entry: unknown) => mapGifboxCategory(entry))
          .filter((entry): entry is GifCategory => entry !== null);
      } catch {
        return [];
      }
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    initialData: [],
  }));

  const trendingGif = useQuery<GifResult | null>(() => ({
    queryKey: ["trendingGif1"],
    queryFn: async () => {
      try {
        if (useGiphy()) {
          const response = await fetch(
            `${GIPHY_API_BASE_URL}/gifs/trending?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}&limit=1&rating=pg-13`,
          );
          const payload = await parseJsonSafe(response);
          const first = Array.isArray(payload?.data) ? payload.data[0] : undefined;
          return first ? mapGiphyToGifResult(first) : null;
        }

        const [authHeader, authHeaderValue] = client()!.authenticationHeader;
        const response = await fetch(
          `${env.DEFAULT_GIFBOX_URL}/trending?locale=en_US&limit=1`,
          {
            headers: {
              [authHeader]: authHeaderValue,
            },
          },
        );
        const payload = await parseJsonSafe(response);
        if (!Array.isArray(payload?.results)) return null;
        return mapGifboxToGifResult(payload.results[0]);
      } catch {
        return null;
      }
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    initialData: null,
  }));

  const items = createMemo(() => {
    return [
      ...(props.favourites[0]
        ? [
            {
              t: 2 as const,
              gif: props.favourites[0],
            },
          ]
        : []),
      {
        t: 1 as const,
        gif: trendingGif.data,
      },
      ...(trendingCategories.data?.map((category) => ({ t: 0 as const, category })) ??
        []),
    ] as CategoryItem[];
  });

  return (
    <GridHost use:invisibleScrollable>
      <TileGrid>
        <For each={items()}>
          {(item) => (
            <CategoryItemView
              item={item}
              onSelectFilter={props.onSelectFilter}
              onOpenFavourites={props.onOpenFavourites}
            />
          )}
        </For>
      </TileGrid>
    </GridHost>
  );
}

const CategoryItemView = (props: {
  item: CategoryItem;
  onSelectFilter: (value: string) => void;
  onOpenFavourites: () => void;
}) => {
  const categoryTitle =
    props.item.t === 0 && typeof props.item.category.title === "string"
      ? props.item.category.title
      : "Category";
  const title =
    props.item.t === 0
      ? categoryTitle
      : props.item.t === 2
        ? "Favourites"
        : "Trending GIFs";
  const image =
    props.item.t === 0
      ? props.item.category.image
      : props.item.gif?.previewUrl ?? "";
  const destinationFilter = props.item.t === 0 ? categoryTitle : "trending";

  return (
    <Category
      style={{
        "background-image": `linear-gradient(to right, #0008, #0008), url("${image}")`,
      }}
      tabIndex={0}
      role="listitem"
      onClick={() =>
        props.item.t === 2
          ? props.onOpenFavourites()
          : props.onSelectFilter(destinationFilter)
      }
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }}
    >
      {title}
    </Category>
  );
};

const Category = styled("div", {
  base: {
    ...typography.raw({ class: "title", size: "small" }),

    width: `${GIF_TILE_WIDTH}px`,
    height: `${GIF_TILE_HEIGHT}px`,
    backgroundSize: "cover",
    backgroundPosition: "center",

    color: "white",
    display: "flex",
    position: "relative",
    padding: "12px",

    alignItems: "end",
    justifyContent: "start",
    textShadow: "0 2px 8px rgba(0, 0, 0, 0.75)",
    borderRadius: "12px",
    border: "1px solid color-mix(in oklab, white 18%, transparent)",

    cursor: "pointer",
  },
});

function GifSearch(props: {
  query: string;
  favouriteUrls: Set<string>;
  onToggleFavourite: (gif: GifResult) => void;
}) {
  const client = useClient();

  const search = useQuery<GifResult[]>(() => ({
    queryKey: ["gifs", props.query],
    queryFn: async () => {
      try {
        if (useGiphy()) {
          const endpoint =
            props.query === "trending" ? "gifs/trending" : "gifs/search";
          const url =
            `${GIPHY_API_BASE_URL}/${endpoint}?api_key=${encodeURIComponent(env.GIPHY_API_KEY)}` +
            (props.query === "trending"
              ? "&limit=50&rating=pg-13"
              : `&limit=50&rating=pg-13&q=${encodeURIComponent(props.query)}`);
          const response = await fetch(url);
          const payload = await parseJsonSafe(response);
          const gifs = Array.isArray(payload?.data) ? payload.data : [];
          return gifs
            .map((gif: GiphyGif) => mapGiphyToGifResult(gif))
            .filter((gif): gif is GifResult => gif !== null);
        }

        const [authHeader, authHeaderValue] = client()!.authenticationHeader;
        const response = await fetch(
          `${env.DEFAULT_GIFBOX_URL}/` +
            (props.query === "trending"
              ? `trending?locale=en_US`
              : `search?locale=en_US&query=${encodeURIComponent(props.query)}`),
          {
            headers: {
              [authHeader]: authHeaderValue,
            },
          },
        );

        const payload = await parseJsonSafe(response);
        if (!Array.isArray(payload?.results)) return [];
        return payload.results
          .map((gif: unknown) => mapGifboxToGifResult(gif))
          .filter((gif): gif is GifResult => gif !== null);
      } catch {
        return [];
      }
    },
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    initialData: [],
  }));

  return (
    <GifGrid
      items={Array.isArray(search.data) ? search.data : []}
      favouriteUrls={props.favouriteUrls}
      onToggleFavourite={props.onToggleFavourite}
    />
  );
}

function GifGrid(props: {
  items: GifResult[];
  favouriteUrls: Set<string>;
  onToggleFavourite: (gif: GifResult) => void;
}) {
  return (
    <GridHost use:invisibleScrollable>
      <TileGrid>
        <For each={props.items}>
          {(item) => (
            <GifItem
              item={item}
              favouriteUrls={props.favouriteUrls}
              onToggleFavourite={props.onToggleFavourite}
            />
          )}
        </For>
      </TileGrid>
      <Match when={props.items.length === 0}>
        <EmptyState>No GIFs found yet. Try another search.</EmptyState>
      </Match>
    </GridHost>
  );
}

const GifItem = (props: {
  item: GifResult;
  favouriteUrls: Set<string>;
  onToggleFavourite: (gif: GifResult) => void;
}) => {
  const { onMessage } = useContext(CompositionMediaPickerContext);
  const isFavourite = () => props.favouriteUrls.has(props.item.url);

  return (
    <GifWrap role="listitem" tabIndex={0}>
      <Gif
        loop
        autoplay
        muted
        preload="auto"
        src={props.item.mediaUrl}
        title={props.item.title}
        onClick={() => onMessage(props.item.sendUrl)}
      />
      <FavouriteButton
        class={isFavourite() ? "on" : ""}
        title={isFavourite() ? "Unfavourite GIF" : "Favourite GIF"}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          props.onToggleFavourite(props.item);
        }}
      >
        {isFavourite() ? "★" : "☆"}
      </FavouriteButton>
    </GifWrap>
  );
};

const GridHost = styled("div", {
  base: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
  },
});

const TileGrid = styled("div", {
  base: {
    display: "grid",
    gridTemplateColumns: `repeat(auto-fill, minmax(${GIF_TILE_WIDTH}px, 1fr))`,
    gap: "8px",
    alignContent: "start",
  },
});

const GifWrap = styled("div", {
  base: {
    width: "100%",
    height: `${GIF_TILE_HEIGHT}px`,
    position: "relative",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid color-mix(in oklab, white 14%, transparent)",
    background: "var(--bg1)",
  },
});

const Gif = styled("video", {
  base: {
    width: "100%",
    height: `${GIF_TILE_HEIGHT}px`,
    cursor: "pointer",
    objectFit: "cover",
  },
});

const FavouriteButton = styled("button", {
  base: {
    position: "absolute",
    top: "8px",
    right: "8px",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    border: "1px solid color-mix(in oklab, white 22%, transparent)",
    background: "color-mix(in oklab, var(--bg0) 76%, transparent)",
    color: "var(--ink)",
    fontSize: "15px",
    lineHeight: "1",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    "&.on": {
      color: "var(--gold)",
      background: "color-mix(in oklab, var(--gold) 28%, var(--bg0))",
    },
  },
});

const EmptyState = styled("div", {
  base: {
    padding: "12px 4px",
    color: "var(--muted)",
    fontSize: "0.9rem",
  },
});
