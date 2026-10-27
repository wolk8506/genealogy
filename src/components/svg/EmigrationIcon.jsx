import SvgIcon from "@mui/material/SvgIcon";

function EmigrationIcon(props) {
  return (
    <SvgIcon {...props} viewBox="14 17 72 72">
      <g fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="18" y="35" width="64" height="50" rx="7" />
        <path d="M41 35V26a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v9" />
        <path d="M34 35v50M66 35v50" />
      </g>
    </SvgIcon>
  );
}

export default EmigrationIcon;
