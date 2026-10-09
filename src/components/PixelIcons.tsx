import type { SVGProps } from "react"; // # Original 16×16 interface icons; square grid geometry, no external artwork.
type Props = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number };
const paths: Record<string, string> = {
  House: "M2 7h2V5h2V3h4v2h2v2h2v2h-2v6H9v-4H7v4H4V9H2z",
  BookOpen:
    "M1 3h5v1h4V3h5v10h-5v1H6v-1H1zm2 2v6h3v1h1V6H6V5zm6 1v6h1v-1h3V5h-3v1z",
  Sprout: "M7 15V8H3V7H1V3h4v1h2v2h1V3h2V1h5v4h-2v2H9v8z",
  Star: "M7 1h2v4h2v1h4v3h-3v2h1v4h-3v-2H6v2H3v-4h1V9H1V6h4V5h2z",
  Plus: "M7 2h2v5h5v2H9v5H7V9H2V7h5z",
  ChartNoAxesCombined: "M2 9h3v5H2zm5-4h3v9H7zm5-4h3v13h-3z",
  Settings: "M6 1h4v2h2v2h3v6h-3v2h-2v2H6v-2H4v-2H1V5h3V3h2zm0 5v4h4V6z",
  ArrowRight: "M8 2h2v2h2v2h2v4h-2v2h-2v2H8v-2h2v-2H1V6h9V4H8z",
  ArrowLeft: "M6 2h2v2H6v2h9v4H6v2h2v2H6v-2H4v-2H2V6h2V4h2z",
  ArrowUpRight: "M5 2h9v9h-2V6h-2v2H8v2H6v2H4v2H2v-2h2v-2h2V8h2V6h2V4H5z",
  ExternalLink: "M8 1h7v7h-2V5h-2v2H9v2H7V7h2V5h2V3H8zM1 4h5v2H3v7h7v-3h2v5H1z",
  ShieldCheck:
    "M2 2h3V1h6v1h3v8h-2v2h-2v2H6v-2H4v-2H2zm3 4v3h2v2h2V9h2V5H9v3H7V6z",
  Sun: "M7 0h2v3H7zm0 13h2v3H7zM0 7h3v2H0zm13 0h3v2h-3zM2 2h2v2H2zm10 0h2v2h-2zM2 12h2v2H2zm10 0h2v2h-2zM5 4h6v1h1v6h-1v1H5v-1H4V5h1z",
  Moon: "M7 1h5v2h-3v2H7v5h2v2h5v2h-3v1H5v-2H3v-2H2V5h2V3h3z",
  CalendarDays:
    "M3 0h2v3H3zm8 0h2v3h-2zM1 2h2v3h10V2h2v13H1zm2 5v6h10V7zm2 1h2v2H5zm4 0h2v2H9zm-4 3h2v1H5z", // # Calendar geometry remains on the existing native 16-pixel icon grid.
  CloudOff:
    "M4 4h2V2h6v2h2v2h2v6H6v-2H2V8H0V6h4zM1 1h2v2H1zm2 2h2v2H3zm2 2h2v2H5zm2 2h2v2H7zm2 2h2v2H9zm2 2h2v2h-2zm2 2h2v2h-2z",
  Download: "M6 1h4v6h3v2h-2v2H9v2H7v-2H5V9H3V7h3zM1 12h2v2h10v-2h2v4H1z",
  Upload: "M7 1h2v2h2v2h2v2h-3v6H6V7H3V5h2V3h2zM1 12h2v2h10v-2h2v4H1z",
  X: "M2 1h2v2h2v2h4V3h2V1h2v3h-2v2h-2v4h2v2h2v3h-2v-2h-2v-2H6v2H4v2H2v-3h2v-2h2V6H4V4H2z",
  Search:
    "M4 1h6v2h2v7h-2v2H4v-2H2V3h2zm1 2v1H4v5h1v1h4V9h1V4H9V3zm6 8h2v2h2v2h-3v-2h-1z",
  Pause: "M3 2h4v12H3zm6 0h4v12H9z",
  Play: "M3 1h2v2h3v2h3v2h3v2h-3v2H8v2H5v2H3z",
  RotateCcw: "M1 1h2v3h2V2h7v2h2v2h1v6h-2v2H6v-2h6v-1h1V6h-2V4H6v2H4v2H1z",
  Volume2:
    "M1 6h3V4h2V2h2v12H6v-2H4v-2H1zm9-2h2v8h-2zm3-3h2v3h1v8h-1v3h-2v-4h1V5h-1z",
  Check: "M2 7h2v2h2v2h2V9h2V7h2V5h2V3h2v4h-2v2h-2v2h-2v2H8v2H5v-2H3v-2H1V7z",
  Headphones: "M5 1h6v2h2v2h2v9h-4V8h2V6h-2V4H5v2H3v2h2v6H1V5h2V3h2z",
  TextCursorInput: "M1 3h8v2H6v8H4V5H1zm9-2h5v2h-1v10h1v2h-5v-2h2V3h-2z",
  Waves:
    "M1 3h3V2h3v2h3v1h2V3h3v2h-2v2H9V6H6V4H4v1H1zm0 6h3V8h3v2h3v1h2V9h3v2h-2v2H9v-1H6v-2H4v1H1z",
};
function icon(name: string) {
  return function PixelIcon({
    size = 20,
    strokeWidth: _strokeWidth,
    fill: _fill,
    ...props
  }: Props) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        aria-hidden="true"
        focusable="false"
        shapeRendering="crispEdges"
        {...props}
      >
        <path d={paths[name]} fill="currentColor" fillRule="evenodd" />
      </svg>
    );
  };
}
export const House = icon("House"),
  BookOpen = icon("BookOpen"),
  Sprout = icon("Sprout"),
  Star = icon("Star"),
  Plus = icon("Plus"),
  ChartNoAxesCombined = icon("ChartNoAxesCombined"),
  Settings = icon("Settings"),
  ArrowRight = icon("ArrowRight"),
  ArrowLeft = icon("ArrowLeft"),
  ArrowUpRight = icon("ArrowUpRight"),
  ExternalLink = icon("ExternalLink"),
  ShieldCheck = icon("ShieldCheck"),
  Sun = icon("Sun"),
  Moon = icon("Moon"),
  CalendarDays = icon("CalendarDays"),
  CloudOff = icon("CloudOff"),
  Download = icon("Download"),
  Upload = icon("Upload"),
  X = icon("X"),
  Search = icon("Search"),
  Pause = icon("Pause"),
  Play = icon("Play"),
  RotateCcw = icon("RotateCcw"),
  Volume2 = icon("Volume2"),
  Check = icon("Check"),
  Headphones = icon("Headphones"),
  TextCursorInput = icon("TextCursorInput"),
  Waves = icon("Waves");
