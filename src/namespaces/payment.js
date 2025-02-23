export default function setupPaymentNamespace(io) {
    const paymentNamespace = io.of("/payment");
  
    paymentNamespace.on('connection', (socket) => {
      socket.on('join', ({ email }) => {
        console.log(`User ${email} joined payment room`);
        socket.join(email);
      });
    });
  
    return paymentNamespace;
  }