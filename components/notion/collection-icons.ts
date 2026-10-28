import {
  Book02Icon,
  BookOpen01Icon,
  Folder01Icon,
  News01Icon,
  NewspaperIcon,
  Notebook01Icon,
} from "@hugeicons/core-free-icons";
import type { ContentType } from "@/lib/content-types";

/** Same glyphs as the desktop shortcuts, so a collection looks the same everywhere. */
export const COLLECTION_ICONS: Record<ContentType, typeof Folder01Icon> = {
  projects: Folder01Icon,
  blog: Notebook01Icon,
  articles: News01Icon,
  tutorials: BookOpen01Icon,
  glossary: Book02Icon,
  news: NewspaperIcon,
};
