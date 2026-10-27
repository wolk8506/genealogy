import SvgIcon from "@mui/material/SvgIcon";

function MarriageIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M7 8.8a3.5 3.5 0 0 1 7 0v1.2a3.5 3.5 0 0 1-7 0V8.8Zm-1.2 4.3c1.6 1.8 3.6 2.7 6.2 2.7s4.6-.9 6.2-2.7M7.4 17.3c1.2 1.3 2.8 2 4.6 2 1.8 0 3.4-.7 4.6-2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="8.7" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="8.7" r="1.1" fill="currentColor" />
    </SvgIcon>
  );
}

export default MarriageIcon;
