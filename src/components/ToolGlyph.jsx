import {
  AlarmClock, AlignLeft, ArrowLeftRight, ArrowRight, Bot, Braces, BriefcaseBusiness,
  Calculator, CalendarPlus, CalendarRange, Camera, Check, Clock3, Code2,
  Crosshair, DollarSign, Earth, FileImage, FileSearch, FileText, Files,
  Fingerprint, FolderOpen, Gauge, GitCompare, Globe, GraduationCap,
  Image, ImageDown, Images, Lightbulb, Link2, MapPin, Mic, Monitor,
  Palette, PenLine, Percent, QrCode, RefreshCw, Scissors, Search,
  Settings, ShieldAlert, Siren, Smile, Sparkles, Star, TestTube2,
  Text, Timer, TriangleAlert, Type, Volume2, Watch, Wrench, Zap,
} from 'lucide-react';

const glyphs = {
  smile: Smile, calendarRange: CalendarRange, calendarPlus: CalendarPlus,
  percent: Percent, alignLeft: AlignLeft, arrowRight: ArrowRight,
  sparkles: Sparkles, type: Type, text: Text, imageDown: ImageDown,
  code: Code2, braces: Braces, images: Images, fileImage: FileImage,
  files: Files, globe: Globe, gauge: Gauge, clock: Clock3,
  dollar: DollarSign, signature: PenLine, volume: Volume2, mic: Mic,
  mapPin: MapPin, monitor: Monitor, camera: Camera,
  swap: ArrowLeftRight, shieldAlert: ShieldAlert, search: Search,
  calculator: Calculator, earth: Earth, qr: QrCode, scissors: Scissors,
  refresh: RefreshCw, fileSearch: FileSearch, lightbulb: Lightbulb,
  graduation: GraduationCap, business: BriefcaseBusiness, wrench: Wrench,
  fileText: FileText, bot: Bot, star: Star, zap: Zap, check: Check,
  settings: Settings, folder: FolderOpen, image: Image,
  crosshair: Crosshair, warning: TriangleAlert, siren: Siren,
  palette: Palette, timer: Timer, gitCompare: GitCompare,
  testTube: TestTube2, link: Link2, fingerprint: Fingerprint,
  alarmClock: AlarmClock, watch: Watch,
};

export default function ToolGlyph({ name, size = 24, strokeWidth = 2 }) {
  const Glyph = glyphs[name] || Wrench;
  return <Glyph width={size} height={size} strokeWidth={strokeWidth} aria-hidden="true"/>;
}
