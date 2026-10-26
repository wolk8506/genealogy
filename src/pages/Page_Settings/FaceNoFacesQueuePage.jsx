import React from "react";
import { useNavigate } from "react-router-dom";
import FacesQueueView from "./FacesQueueView";

export default function FaceNoFacesQueuePage({ allPeople }) {
  const navigate = useNavigate();

  return (
    <FacesQueueView
      mode="noFaces"
      allPeople={allPeople}
      onExit={() => navigate("/settings")}
    />
  );
}
