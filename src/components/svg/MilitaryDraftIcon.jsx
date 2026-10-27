import SvgIcon from "@mui/material/SvgIcon";

function MilitaryDraftIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M7 10V9a5 5 0 0 1 10 0v1M5 10h14m-11 0v1a4 4 0 0 0 8 0v-1M4 21v-1a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v1m-12-5 5 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="7" r="1" fill="none" stroke="currentColor" strokeWidth="2" />
    </SvgIcon>
  );
}

export default MilitaryDraftIcon;
