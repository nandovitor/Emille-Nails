  import React, { useState, useMemo, useEffect } from 'react';

  // --- Type Definitions ---
  type Page = 'HOME' | 'SERVICES' | 'DATETIME' | 'USER_INFO' | 'CONFIRM' | 'PAYMENT' | 'SUCCESS';
  type ModalType = 'PORTFOLIO' | 'CONTACT';

  interface Service { id: string; name: string; price: number; }
  interface UserInfo { name: string; phone: string; }

  interface BookingState {
    currentPage: Page;
    selectedServices: Map<string, number>;
    selectedDate: string;
    selectedTime: string;
    userInfo: UserInfo;
  }

  // --- Constants ---
  const SERVICES: Service[] = [
    { id: 'manicure', name: 'Manicure', price: 20 },
    { id: 'pedicure', name: 'Pedicure', price: 20 },
    { id: 'spa', name: 'Spa dos Pés', price: 35 },
  ];
  
  // --- Helper Functions ---
  const generateWhatsappUrl = (bookingState: BookingState, totalCost: number): string => {
    const { selectedServices, selectedDate, selectedTime, userInfo } = bookingState;

    const serviceNames = Array.from(selectedServices.keys())
        .map(id => SERVICES.find(s => s.id === id)?.name)
        .filter(Boolean);

    const formattedDate = selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';

    const serviceNamesText = serviceNames.join(', ');
    const message = encodeURIComponent(
        `Olá! Gostaria de confirmar meu agendamento na Emille Nails:\n\n` +
        `*Cliente:* ${userInfo.name}\n` +
        `*Serviços:* ${serviceNamesText}\n` +
        `*Data:* ${formattedDate}\n` +
        `*Horário:* ${selectedTime}\n\n` +
        `*Total:* R$ ${totalCost.toFixed(2)}`
    );
    
    const businessWhatsappNumber = "5573981067554"; 
    
    return `https://wa.me/${businessWhatsappNumber}?text=${message}`;
  };


  // --- Custom Hook for LocalStorage ---
  function usePersistentState<T>(key: string, initialState: T): [T, React.Dispatch<React.SetStateAction<T>>] {
      const [state, setState] = useState<T>(() => {
          try {
              const storedValue = window.localStorage.getItem(key);
              if (storedValue) {
                  const parsed = JSON.parse(storedValue);
                  // Handle Map deserialization for bookingState
                  if (key === 'bookingState' && parsed.selectedServices) {
                      parsed.selectedServices = new Map(parsed.selectedServices);
                  }
                  return { ...initialState, ...parsed };
              }
          } catch (error) {
              console.error("Error reading from localStorage", error);
          }
          return initialState;
      });

      useEffect(() => {
          try {
              // Handle Map serialization for bookingState
              let valueToStore: any = state;
              if (key === 'bookingState' && (state as BookingState).selectedServices instanceof Map) {
                  valueToStore = {
                      ...state,
                      selectedServices: Array.from((state as BookingState).selectedServices.entries())
                  };
              }
              window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (error) {
              console.error("Error writing to localStorage", error);
          }
      }, [key, state]);

      return [state, setState];
  }

  // --- Main App Component ---
  const App: React.FC = () => {
    const [bookingState, setBookingState] = usePersistentState<BookingState>('bookingState', {
      currentPage: 'HOME',
      selectedServices: new Map<string, number>(),
      selectedDate: '',
      selectedTime: '',
      userInfo: { name: '', phone: '' },
    });

    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    
    const { currentPage, selectedServices } = bookingState;

    const updateState = (updates: Partial<BookingState>) => {
      setBookingState(prev => ({ ...prev, ...updates }));
    };

    const handleServiceToggle = (serviceId: string, price: number) => {
      const newSelection = new Map(selectedServices);
      if (newSelection.has(serviceId)) {
        newSelection.delete(serviceId);
      } else {
        newSelection.set(serviceId, price);
      }
      updateState({ selectedServices: newSelection });
    };
    
    const totalCost = useMemo(() => {
      let total = 0;
      selectedServices.forEach(price => total += price);
      return total;
    }, [selectedServices]);

    const resetBooking = () => {
      localStorage.removeItem('bookingState');
      setBookingState({
        currentPage: 'HOME',
        selectedServices: new Map(),
        selectedDate: '',
        selectedTime: '',
        userInfo: { name: '', phone: '' },
      });
    };

    const pages: Page[] = ['SERVICES', 'DATETIME', 'USER_INFO', 'CONFIRM'];
    const currentPageIndex = pages.indexOf(currentPage);

    const renderPage = () => {
      switch (currentPage) {
        case 'HOME': return <HomePage onNext={() => updateState({ currentPage: 'SERVICES' })} onModalOpen={setActiveModal} />;
        case 'SERVICES': return <ServicesPage bookingState={bookingState} onServiceToggle={handleServiceToggle} onNext={() => updateState({ currentPage: 'DATETIME' })} onBack={() => updateState({ currentPage: 'HOME' })} />;
        case 'DATETIME': return <DateTimePage bookingState={bookingState} updateState={updateState} onNext={() => updateState({ currentPage: 'USER_INFO' })} onBack={() => updateState({ currentPage: 'SERVICES' })} />;
        case 'USER_INFO': return <UserInfoPage bookingState={bookingState} updateState={updateState} onNext={() => updateState({ currentPage: 'CONFIRM' })} onBack={() => updateState({ currentPage: 'DATETIME' })} />;
        case 'CONFIRM': return <ConfirmationPage 
            bookingState={bookingState} 
            totalCost={totalCost} 
            onConfirmAndPayLater={() => {
                const url = generateWhatsappUrl(bookingState, totalCost);
                window.open(url, '_blank', 'noopener,noreferrer');
                updateState({ currentPage: 'SUCCESS' });
            }} 
            onGoToPayment={() => updateState({ currentPage: 'PAYMENT' })}
            onBack={() => updateState({ currentPage: 'USER_INFO' })} 
        />;
        case 'PAYMENT': return <PaymentPage
            bookingState={bookingState}
            totalCost={totalCost}
            onConfirmAndPay={() => {
                const url = generateWhatsappUrl(bookingState, totalCost);
                window.open(url, '_blank', 'noopener,noreferrer');
                updateState({ currentPage: 'SUCCESS' });
            }}
            onBack={() => updateState({ currentPage: 'CONFIRM' })}
        />;
        case 'SUCCESS': return <SuccessPage onFinish={resetBooking} />;
        default: return <HomePage onNext={() => updateState({ currentPage: 'SERVICES' })} onModalOpen={setActiveModal} />;
      }
    };

    const renderModal = () => {
      if (!activeModal) return null;
      switch (activeModal) {
          case 'PORTFOLIO': return <PortfolioModal onClose={() => setActiveModal(null)} />;
          case 'CONTACT': return <ContactModal onClose={() => setActiveModal(null)} />;
          default: return null;
      }
    };

    return (
      <div className="app-container">
          {currentPageIndex >= 0 && <ProgressIndicator currentStep={currentPageIndex} totalSteps={pages.length} />}
          {renderPage()}
          {renderModal()}
      </div>
    );
  };

  export default App;


  // --- Child Components & Props ---

  interface ProgressIndicatorProps {
    currentStep: number;
    totalSteps: number;
  }

  const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({currentStep, totalSteps}) => {
      const progressPercentage = totalSteps > 1 ? (currentStep / (totalSteps - 1)) * 100 : 0;
      return (
          <div className="progress-indicator">
              <div className="progress-indicator-bar" style={{width: `${progressPercentage}%`}}></div>
              {Array.from({length: totalSteps}).map((_, index) => (
                  <div key={index} className={`step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}></div>
              ))}
          </div>
      );
  }

  interface HomePageProps {
    onNext: () => void;
    onModalOpen: (type: ModalType) => void;
  }

  const HomePage: React.FC<HomePageProps> = ({ onNext, onModalOpen }) => (
    <div className="page">
      <header className="header" style={{ marginBottom: '1rem' }}>
        <h1>Emille Nails</h1>
        <p>Pedicure & Manicure</p>
      </header>
      <p style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Bem-vinda ao seu espaço de beleza e cuidado.
      </p>
      <button onClick={onNext} className="cta-button">Agendar Agora</button>
      <div className="home-actions">
        <button onClick={() => onModalOpen('PORTFOLIO')} className="nav-button secondary">Nosso Portfólio</button>
        <button onClick={() => onModalOpen('CONTACT')} className="nav-button secondary">Contato e Endereço</button>
      </div>
    </div>
  );

  interface ServicesPageProps {
    bookingState: BookingState;
    onServiceToggle: (id: string, price: number) => void;
    onNext: () => void;
    onBack: () => void;
  }

  const ServicesPage: React.FC<ServicesPageProps> = ({ bookingState, onServiceToggle, onNext, onBack }) => (
    <div className="page">
      <header className="header">
        <h2>Nossos Serviços</h2>
        <p>Selecione os serviços desejados.</p>
      </header>
      <div className="service-list">
        {SERVICES.map(service => (
          <div key={service.id}>
            <div
              className={`service-card ${bookingState.selectedServices.has(service.id) ? 'selected' : ''}`}
              onClick={() => onServiceToggle(service.id, service.price)}
              role="checkbox"
              aria-checked={bookingState.selectedServices.has(service.id)}
            >
              <div className="service-card-header">
                <h3>{service.name}</h3>
                <span>R$ {service.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="nav-buttons">
          <button onClick={onBack} className="nav-button secondary">Voltar</button>
          <button onClick={onNext} className="nav-button" disabled={bookingState.selectedServices.size === 0}>Próximo</button>
      </div>
    </div>
  );

  interface DateTimePageProps {
    bookingState: BookingState;
    updateState: (updates: Partial<BookingState>) => void;
    onNext: () => void;
    onBack: () => void;
  }

  const DateTimePage: React.FC<DateTimePageProps> = ({ bookingState, updateState, onNext, onBack }) => {
      const { selectedDate, selectedTime } = bookingState;
      const [dateError, setDateError] = useState('');
      const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
      const disabledSlots = useMemo(() => new Set(["11:00"]), []);

      const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const date = new Date(e.target.value + "T00:00:00");
          if (date.getUTCDay() === 0) { // Sunday
              setDateError("Desculpe, não atendemos aos domingos.");
          } else {
              setDateError('');
          }
          updateState({ selectedDate: e.target.value });
      }
      
      return (
          <div className="page date-time-container">
              <header className="header">
                  <h2>Data e Hora</h2>
                  <p>Escolha o melhor dia e horário para você.</p>
              </header>
              <div className="form-group">
                  <label htmlFor="date-picker">Data</label>
                  <input 
                      type="date" 
                      id="date-picker"
                      value={selectedDate}
                      onChange={handleDateChange}
                      min={new Date().toISOString().split("T")[0]}
                  />
                  {dateError && <p className="form-error">{dateError}</p>}
              </div>
              <div className="form-group">
                  <label>Horário</label>
                  <div className="time-slots">
                      {timeSlots.map(time => {
                          const isDisabled = disabledSlots.has(time);
                          return (
                              <div 
                                  key={time}
                                  className={`time-slot ${selectedTime === time ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                  onClick={() => !isDisabled && updateState({ selectedTime: time })}
                                  role="button"
                                  aria-pressed={selectedTime === time}
                                  aria-disabled={isDisabled}
                              >
                                  {time}
                              </div>
                          )
                      })}
                  </div>
              </div>
              <div className="nav-buttons">
                  <button onClick={onBack} className="nav-button secondary">Voltar</button>
                  <button onClick={onNext} className="nav-button" disabled={!selectedDate || !selectedTime || !!dateError}>Próximo</button>
              </div>
          </div>
      );
  };

  interface UserInfoPageProps {
    bookingState: BookingState;
    updateState: (updates: Partial<BookingState>) => void;
    onNext: () => void;
    onBack: () => void;
  }

  const UserInfoPage: React.FC<UserInfoPageProps> = ({ bookingState, updateState, onNext, onBack }) => {
      const { userInfo } = bookingState;
      const isFormValid = userInfo.name.trim() !== '' && userInfo.phone.trim().length > 8;

      return (
          <div className="page user-info-container">
              <header className="header">
                  <h2>Seus Dados</h2>
                  <p>Precisamos de algumas informações para confirmar.</p>
              </header>
              <div className="form-group">
                  <label htmlFor="name">Nome Completo</label>
                  <input
                      type="text"
                      id="name"
                      value={userInfo.name}
                      onChange={(e) => updateState({ userInfo: { ...userInfo, name: e.target.value } })}
                      placeholder="Seu nome"
                  />
              </div>
              <div className="form-group">
                  <label htmlFor="phone">Telefone (WhatsApp)</label>
                  <input
                      type="tel"
                      id="phone"
                      value={userInfo.phone}
                      onChange={(e) => updateState({ userInfo: { ...userInfo, phone: e.target.value } })}
                      placeholder="(XX) XXXXX-XXXX"
                  />
              </div>
              <div className="nav-buttons">
                  <button onClick={onBack} className="nav-button secondary">Voltar</button>
                  <button onClick={onNext} className="nav-button" disabled={!isFormValid}>Próximo</button>
              </div>
          </div>
      );
  };

  interface ConfirmationPageProps {
    bookingState: BookingState;
    totalCost: number;
    onConfirmAndPayLater: () => void;
    onGoToPayment: () => void;
    onBack: () => void;
  }

  const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ bookingState, totalCost, onConfirmAndPayLater, onGoToPayment, onBack }) => {
      const { selectedServices, selectedDate, selectedTime, userInfo } = bookingState;

      const serviceNames = Array.from(selectedServices.keys())
          .map(id => SERVICES.find(s => s.id === id)?.name)
          .filter(Boolean);

      const formattedDate = selectedDate ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';

      return (
          <div className="page confirmation-container">
              <header className="header">
                  <h2>Confirmação</h2>
                  <p>Revise os detalhes do seu agendamento.</p>
              </header>
              <div className="confirmation-summary">
                  <h4>Resumo</h4>
                  <p><strong>Cliente:</strong> {userInfo.name}</p>
                  <p><strong>Telefone:</strong> {userInfo.phone}</p>
                  <p><strong>Serviços:</strong> {serviceNames.join(', ')}</p>
                  <p><strong>Data:</strong> {formattedDate}</p>
                  <p><strong>Horário:</strong> {selectedTime}</p>
                  <p><strong>Total:</strong> R$ {totalCost.toFixed(2)}</p>
              </div>
              
              <div className="payment-prompt">
                  <h4>Deseja efetuar o pagamento antecipado?</h4>
                  <p>Pague agora para agilizar seu atendimento ou pague no local.</p>
              </div>

              <div className="nav-buttons-column">
                  <button onClick={onGoToPayment} className="nav-button">Pagar Agora</button>
                  <button onClick={onConfirmAndPayLater} className="nav-button secondary">Pagar no Local e Enviar Confirmação</button>
                  <button onClick={onBack} className="nav-button tertiary">Voltar</button>
              </div>
          </div>
      )
  };

  interface PaymentPageProps {
    bookingState: BookingState;
    totalCost: number;
    onConfirmAndPay: () => void;
    onBack: () => void;
  }

  const PaymentPage: React.FC<PaymentPageProps> = ({ totalCost, onConfirmAndPay, onBack }) => {
      const [method, setMethod] = useState<'PIX' | 'CARD' | null>(null);

      const handleCopyPixKey = () => {
          // This is a placeholder BRCode. A real one would be dynamically generated.
          const pixKey = "00020126580014br.gov.bcb.pix013668ab538f-4e3f-459a-9970-5210eaa6d6495204000053039865802BR5913EMILLE NAILS6009SAO PAULO62070503***6304E2C2";
          navigator.clipboard.writeText(pixKey).then(() => {
              alert('Código PIX (copia e cola) copiado para a área de transferência!');
          }).catch(err => {
              console.error('Falha ao copiar a chave PIX: ', err);
              alert('Não foi possível copiar o código PIX.');
          });
      };
      
      const handlePayWithCard = (e: React.FormEvent) => {
          e.preventDefault();
          alert("Demonstração: O pagamento com cartão seria processado aqui. Clicando em OK, seu agendamento será confirmado via WhatsApp.");
          onConfirmAndPay();
      };

      if (!method) {
          return (
              <div className="page payment-page">
                  <header className="header">
                      <h2>Pagamento Antecipado</h2>
                      <p>Total: <strong>R$ {totalCost.toFixed(2)}</strong></p>
                  </header>
                  <p style={{textAlign: 'center', marginBottom: '1.5rem'}}>Escolha sua forma de pagamento preferida.</p>
                  <div className="payment-options">
                      <button className="nav-button" onClick={() => setMethod('PIX')}>Pagar com PIX</button>
                      <button className="nav-button" onClick={() => setMethod('CARD')}>Pagar com Cartão de Crédito</button>
                  </div>
                  <div className="nav-buttons">
                      <button onClick={onBack} className="nav-button secondary">Voltar para Resumo</button>
                  </div>
              </div>
          );
      }

      if (method === 'PIX') {
          const pixUrl = "https://nubank.com.br/cobrar/185dar/68ab538f-4e3f-459a-9970-5210eaa6d649";
          return (
              <div className="page payment-page">
                  <header className="header">
                      <h2>Pagar com PIX</h2>
                      <p>Total: <strong>R$ {totalCost.toFixed(2)}</strong></p>
                  </header>
                  <div className="pix-details">
                      <p>Abra o app do seu banco e escaneie o código abaixo para pagar.</p>
                      <a href={pixUrl} target="_blank" rel="noopener noreferrer">
                          <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixUrl)}`}
                              alt="QR Code para pagamento PIX" 
                              className="pix-qr-code"
                          />
                      </a>
                      <p style={{marginTop: '1rem', marginBottom: '0.5rem'}}>Ou use o PIX Copia e Cola:</p>
                      <button className="nav-button secondary" onClick={handleCopyPixKey}>Copiar Código PIX</button>
                  </div>

                  <div className="nav-buttons-column">
                    <button onClick={onConfirmAndPay} className="nav-button">Já Paguei, Enviar Confirmação</button>
                    <button onClick={() => setMethod(null)} className="nav-button tertiary">Escolher Outro Método</button>
                  </div>
              </div>
          );
      }
      
      if (method === 'CARD') {
          return (
              <div className="page payment-page">
                  <header className="header">
                      <h2>Pagar com Cartão de Crédito</h2>
                      <p>Total: <strong>R$ {totalCost.toFixed(2)}</strong></p>
                  </header>
                  <form className="card-form" onSubmit={handlePayWithCard}>
                      <div className="card-form-disclaimer">
                          <strong>Atenção:</strong> Este é um formulário de demonstração. <strong>Não insira dados reais.</strong>
                      </div>
                      <div className="form-group">
                          <label htmlFor="cardNumber">Número do Cartão</label>
                          <input type="text" id="cardNumber" inputMode="numeric" pattern="[\d ]{16,22}" autoComplete="cc-number" placeholder="0000 0000 0000 0000" required />
                      </div>
                      <div className="form-group">
                          <label htmlFor="cardName">Nome no Cartão</label>
                          <input type="text" id="cardName" autoComplete="cc-name" placeholder="Seu nome como no cartão" required />
                      </div>
                      <div className="form-row">
                          <div className="form-group">
                              <label htmlFor="cardExpiry">Validade</label>
                              <input type="text" id="cardExpiry" autoComplete="cc-exp" placeholder="MM/AA" required />
                          </div>
                          <div className="form-group">
                              <label htmlFor="cardCVC">CVC</label>
                              <input type="text" id="cardCVC" inputMode="numeric" autoComplete="cc-csc" placeholder="123" required />
                          </div>
                      </div>
                      <div className="nav-buttons-column">
                          <button type="submit" className="nav-button">Pagar R$ {totalCost.toFixed(2)}</button>
                          <button type="button" onClick={() => setMethod(null)} className="nav-button tertiary">Escolher Outro Método</button>
                      </div>
                  </form>
              </div>
          );
      }
      
      return null;
  };

  const SuccessPage: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
      <div className="page">
          <div className="success-message">
              <div className="success-icon">💅</div>
              <h2>Agendamento Realizado!</h2>
              <p>Seu horário foi salvo. Por favor, envie a mensagem que abrimos no seu WhatsApp para confirmar. Mal podemos esperar para te ver!</p>
          </div>
          <button onClick={onFinish} className="nav-button">Agendar Outro Horário</button>
      </div>
  );

  const Modal: React.FC<{ children: React.ReactNode, onClose: () => void }> = ({ children, onClose }) => (
      <div className="modal-overlay" onClick={onClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <button onClick={onClose} className="modal-close-button">&times;</button>
              {children}
          </div>
      </div>
  );

  const PortfolioModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
      <Modal onClose={onClose}>
          <header className="header" style={{marginBottom: "1rem"}}><h2>Nosso Trabalho</h2></header>
          <div className="portfolio-gallery">
              <a href="https://www.instagram.com/emille_unhas?igsh=MXE1cW5jY2txampmMg==" target="_blank" rel="noopener noreferrer" className="instagram-card">
                <div className="instagram-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </div>
                <span>Ver no<br/>Instagram</span>
              </a>
          </div>
      </Modal>
  );

  const ContactModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
      <Modal onClose={onClose}>
          <header className="header" style={{marginBottom: "1rem"}}><h2>Contato e Endereço</h2></header>
          <div className="contact-info">
              <p><strong>Endereço:</strong> RUA SIQUEIRA CAMPOS - 223 - CENTRO</p>
              <p><strong>WhatsApp:</strong> (73) 98106-7554</p>
              <p><strong>Horário de Funcionamento:</strong><br/>
              Segunda a Sábado: 09:00 - 18:00<br/>
              Domingo: Fechado</p>
          </div>
      </Modal>
  );
