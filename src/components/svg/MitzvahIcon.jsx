import SvgIcon from "@mui/material/SvgIcon";

function MitzvahIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <path
        d="M3.96 4.28v15.39M8.09 4.28v15.39M15.91 4.28v15.39M20.04 4.28v15.39M8.09 8.11h7.82M8.09 15.76h7.82"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.83"
        strokeLinecap="butt"
      />
      <g fill="currentColor" stroke="none">
        <rect x="2.22" y="3.11" width="7.61" height="2.35" rx="0.7" />
        <rect x="14.17" y="3.11" width="7.61" height="2.35" rx="0.7" />
        <rect x="2.22" y="18.5" width="7.61" height="2.35" rx="0.7" />
        <rect x="14.17" y="18.5" width="7.61" height="2.35" rx="0.7" />
        <circle cx="6.02" cy="2.65" r="1.15" />
        <circle cx="17.98" cy="2.65" r="1.15" />
        <circle cx="6.02" cy="21.28" r="1.15" />
        <circle cx="17.98" cy="21.28" r="1.15" />
      </g>
    </SvgIcon>
  );
}

export default MitzvahIcon;
