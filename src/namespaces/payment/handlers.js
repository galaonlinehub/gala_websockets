export const handleEmailJoin = (s, { email }) => {
  if (email) {
    s.join(email);
  } else {
    console.warn("No email provided in join event.");
  }
};
