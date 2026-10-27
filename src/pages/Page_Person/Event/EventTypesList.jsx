// import CustomDatePickerDialog from "../../components/CustomDatePickerDialog";
import DescriptionIcon from "@mui/icons-material/Description";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import DeathIcon from "../../../components/svg/DeathIcon";
import HealthAndSafetyIcon from "@mui/icons-material/HealthAndSafety";
import ElderlyIcon from "@mui/icons-material/Elderly";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssignmentIcon from "@mui/icons-material/Assignment";
import GavelIcon from "@mui/icons-material/Gavel";
import ChurchIcon from "@mui/icons-material/Church";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import EmojiFlagsIcon from "@mui/icons-material/EmojiFlags";
import SchoolIcon from "@mui/icons-material/School";
import BookmarkRemoveIcon from "@mui/icons-material/BookmarkRemove";
import CremationIcon from "../../../components/svg/CremationIcon";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import HeartBrokenIcon from "@mui/icons-material/HeartBroken";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import SickIcon from "@mui/icons-material/Sick";
import BalanceIcon from "@mui/icons-material/Balance";

import BirthIcon from "../../../components/svg/BirthIcon";
import HomeOutlineIcon from "../../../components/svg/HomeOutlineIcon";
import MitzvahIcon from "../../../components/svg/MitzvahIcon";
import BookOpenBlankVariantOutlineIcon from "../../../components/svg/BookOpenBlankVariantOutlineIcon";
import CoffinIcon from "../../../components/svg/CoffinIcon";
import HomeAccountIcon from "../../../components/svg/HomeAccountIcon";
import HumanMaleFemaleIcon from "../../../components/svg/HumanMaleFemaleIcon";
import HumanMaleChildIcon from "../../../components/svg/HumanMaleChildIcon";
import HandsPrayIcon from "../../../components/svg/HandsPrayIcon";
import DiamondRingIcon from "../../../components/svg/DiamondRingIcon";
import CategoryTicketIcon from "../../../components/svg/CategoryTicketIcon";
import HammerIcon from "../../../components/svg/HammerIcon";
import TrainingIcon from "../../../components/svg/TrainingIcon";
import WeddingRingsIcon from "../../../components/svg/WeddingRingsIcon";
import BlessingIcon from "../../../components/svg/BlessingIcon";
import BaptismIcon from "../../../components/svg/BaptismIcon";
import BaptismLdsIcon from "../../../components/svg/BaptismLdsIcon";
import BaptismAdultIcon from "../../../components/svg/BaptismAdultIcon";
import BaptismChildIcon from "../../../components/svg/BaptismChildIcon";
import FirstCommunionIcon from "../../../components/svg/FirstCommunionIcon";
import NobleTitleIcon from "../../../components/svg/NobleTitleIcon";
import MarriageContractIcon from "../../../components/svg/MarriageContractIcon";
import BurialIcon from "../../../components/svg/BurialIcon";
import DivorceIcon from "../../../components/svg/DivorceIcon";
import MilitaryServiceIcon from "../../../components/svg/MilitaryServiceIcon";
import MilitaryDraftIcon from "../../../components/svg/MilitaryDraftIcon";
import DivorceFilingIcon from "../../../components/svg/DivorceFilingIcon";
import OrdinationIcon from "../../../components/svg/OrdinationIcon";
import CitizenshipIcon from "../../../components/svg/CitizenshipIcon";
import ImmigrationIcon from "../../../components/svg/ImmigrationIcon";
import NaturalizationIcon from "../../../components/svg/NaturalizationIcon";
import EmigrationIcon from "../../../components/svg/EmigrationIcon";

export const EVENT_TYPES = [
  { name: "Бар-мицва", icon: <MitzvahIcon /> },
  { name: "Бат-мицва", icon: <MitzvahIcon /> },
  { name: "Благословение", icon: <BlessingIcon /> },
  { name: "Болезнь", icon: <SickIcon /> },
  { name: "Брак", icon: <WeddingRingsIcon /> },
  { name: "Брачный договор", icon: <DescriptionIcon /> },
  { name: "Брачный контракт", icon: <MarriageContractIcon /> },
  { name: "Воинская награда", icon: <MilitaryTechIcon /> },
  { name: "Воинская служба", icon: <MilitaryServiceIcon /> },
  { name: "Выкидыш", icon: <HealthAndSafetyIcon /> },
  { name: "Выход на пенсию", icon: <ElderlyIcon /> },
  { name: "Венчание супругов в церкви LDS", icon: <HumanMaleFemaleIcon /> },
  { name: "Гражданство, подданство", icon: <CitizenshipIcon /> },
  { name: "Гражданский брак", icon: <FavoriteBorderIcon /> },
  { name: "Дворянский титул", icon: <NobleTitleIcon /> },
  { name: "Документ на владение", icon: <ReceiptLongIcon /> },
  { name: "Завещание", icon: <DescriptionIcon /> },
  { name: "Земельная сделка", icon: <GavelIcon /> },
  { name: "Иммиграция", icon: <ImmigrationIcon /> },
  { name: "Инициация в церкви LDS", icon: <ChurchIcon /> },
  { name: "Иное событие", icon: <AutoAwesomeIcon /> },
  { name: "Конфирмация", icon: <VerifiedUserIcon /> },
  { name: "Конфирмация в церкви LDS", icon: <VerifiedUserIcon /> },
  { name: "Кремация", icon: <CremationIcon /> },
  { name: "Крещение", icon: <BaptismIcon /> },
  { name: "Крещение в церкви LDS", icon: <BaptismLdsIcon /> },
  { name: "Крещение взрослого", icon: <BaptismAdultIcon /> },
  { name: "Крещение ребёнка", icon: <BaptismChildIcon /> },
  { name: "Место жительства", icon: <HomeOutlineIcon /> },
  { name: "Миссия", icon: <EmojiFlagsIcon /> },
  { name: "Наследственное дело", icon: <BalanceIcon /> },
  { name: "Натурализация", icon: <NaturalizationIcon /> },
  { name: "Образование", icon: <BookOpenBlankVariantOutlineIcon /> },
  { name: "Обрезание", icon: <HealthAndSafetyIcon /> },
  { name: "Обучение", icon: <TrainingIcon /> },
  { name: "Окончание учебного заведения", icon: <SchoolIcon /> },
  { name: "Обязательство", icon: <DiamondRingIcon /> },
  { name: "Отлучение от церкви", icon: <BookmarkRemoveIcon /> },
  { name: "Первое причастие", icon: <FirstCommunionIcon /> },
  { name: "Подача на развод", icon: <DivorceFilingIcon /> },
  { name: "Перепись", icon: <AssignmentIcon /> },
  { name: "Погребение", icon: <BurialIcon /> },
  { name: "Посвящение в церкви LDS", icon: <ChurchIcon /> },
  { name: "Похоронная церемония", icon: <CoffinIcon /> },
  { name: "Призыв на воинскую службу", icon: <MilitaryDraftIcon /> },
  { name: "Прозвище", icon: <AccountCircleIcon /> },
  { name: "Религия", icon: <HandsPrayIcon /> },
  { name: "Род занятий", icon: <HammerIcon /> },
  { name: "Рождение", icon: <BirthIcon /> },
  { name: "Роспись", icon: <HistoryEduIcon /> },
  { name: "Рукоположение", icon: <OrdinationIcon /> },
  { name: "Развод", icon: <DivorceIcon /> },
  { name: "Разлука", icon: <HeartBrokenIcon /> },
  { name: "Разрешение на брак", icon: <CategoryTicketIcon /> },
  { name: "Религиозный брак", icon: <ChurchIcon /> },
  { name: "Смерть", icon: <DeathIcon /> },
  { name: "Соединение с родителями LDS", icon: <HumanMaleChildIcon /> },
  { name: "Увольнение с воинской службы", icon: <PersonRemoveIcon /> },
  { name: "Усыновление", icon: <HomeAccountIcon /> },
  { name: "Эмиграция", icon: <EmigrationIcon /> },
];
