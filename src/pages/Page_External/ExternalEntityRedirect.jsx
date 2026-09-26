import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ExternalEntityRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/external?selected=${encodeURIComponent(id)}`, {
        replace: true,
      });
    } else {
      navigate("/external", { replace: true });
    }
  }, [id, navigate]);

  return null;
}
