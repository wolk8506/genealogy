import SvgIcon from "@mui/material/SvgIcon";

function OrdinationIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M12 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm-9 20v-2.5a6.5 6.5 0 0 1 6.5-6.5h5a6.5 6.5 0 0 1 6.5 6.5V22z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 15v5.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9.8 16.8h4.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </SvgIcon>
  );
}

export default OrdinationIcon;
