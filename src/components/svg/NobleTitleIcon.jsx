import SvgIcon from "@mui/material/SvgIcon";

function NobleTitleIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M3.67 9.01 3.96 11.5l.48 1.6.89 3.2.03 2.31v.09q0 .67.66.67h11.96q.66 0 .66-.67v-.09l.03-2.31.89-3.2.48-1.6.29-2.49M3.67 9.01l4.97 2.8L12 5.46l3.36 6.35 4.97-2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.22"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="3.67" cy="9.01" r="2.22" fill="currentColor" />
      <circle cx="20.33" cy="9.01" r="2.22" fill="currentColor" />
      <circle cx="12" cy="5.46" r="2" fill="currentColor" />
    </SvgIcon>
  );
}

export default NobleTitleIcon;
