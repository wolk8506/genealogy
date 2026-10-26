import React from "react";
import { useNavigate } from "react-router-dom";
import FacesQueueView from "./FacesQueueView";

export default function FaceReviewQueuePage({ allPeople }) {
  const navigate = useNavigate();

  return (
    <FacesQueueView
      mode="review"
      allPeople={allPeople}
      onExit={() => navigate("/settings")}
    />
  );
}
