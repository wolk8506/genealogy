import SvgIcon from "@mui/material/SvgIcon";

function ReligionIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M12 3.5 18 7v11.5H6V7l6-3.5Zm-4.5 8.2h9m-8.2 2.6h7.4M12 3.5v15.2M8.5 10.5v6.3m7-6.3v6.3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 3.5v4.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </SvgIcon>
  );
}

export default ReligionIcon;
