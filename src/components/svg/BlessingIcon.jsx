import SvgIcon from "@mui/material/SvgIcon";

function BlessingIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24">
      <polygon
        points="12,2.05 13.01,3.8 15.03,3.8 14.02,5.55 15.03,7.3 13.01,7.3 12,9.05 10.99,7.3 8.97,7.3 9.98,5.55 8.97,3.8 10.99,3.8"
        fill="currentColor"
        stroke="none"
      />
      <path
        d="M12 13.75V19.5M8.9 14.8 7.1 12.5V8.2a1.67 1.67 0 0 0-3.34 0V15L6.6 18.2V19.5M7.1 10.95H8q1.2 0 2 1.3l2 1.5M15.1 14.8 16.9 12.5V8.2a1.67 1.67 0 0 1 3.34 0V15L17.4 18.2V19.5M16.9 10.95H16q-1.2 0-2 1.3l-2 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="5.75" y="19.5" width="12.5" height="2.75" rx="0.5" fill="currentColor" stroke="none" />
    </SvgIcon>
  );
}

export default BlessingIcon;
