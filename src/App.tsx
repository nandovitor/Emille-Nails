import React, { useState, useMemo, useEffect } from 'react';

// --- Type Definitions ---
type Page = 'HOME' | 'SERVICES' | 'DATETIME' | 'USER_INFO' | 'CONFIRM' | 'SUCCESS';
type ModalType = 'PORTFOLIO' | 'CONTACT';

interface Service { id: string; name: string; price: number; }
interface PedicureOption { id: string; name: string; price: number; }
interface UserInfo { name: string; phone: string; }

interface BookingState {
  currentPage: Page;
  selectedServices: Map<string, number>;
  selectedPedicureOption: string | null;
  selectedDate: string;
  selectedTime: string;
  userInfo: UserInfo;
}

// --- Constants ---
const SERVICES: Service[] = [
  { id: 'manicure', name: 'Manicure', price: 30 },
  { id: 'pedicure', name: 'Pedicure', price: 0 },
  { id: 'spa', name: 'Spar dos Pés', price: 50 },
];

const PEDICURE_OPTIONS: PedicureOption[] = [
    { id: 'pedicure_completo', name: 'Cutilagem e Esmaltação (Completo)', price: 40 },
    { id: 'pedicure_cutilagem', name: 'Apenas Cutilagem', price: 25 },
    { id: 'pedicure_esmalte', name: 'Apenas Esmaltação', price: 20 },
];

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
    selectedPedicureOption: null,
    selectedDate: '',
    selectedTime: '',
    userInfo: { name: '', phone: '' },
  });

  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  
  const { currentPage, selectedServices, selectedPedicureOption, selectedDate, selectedTime, userInfo } = bookingState;

  const updateState = (updates: Partial<BookingState>) => {
    setBookingState(prev => ({ ...prev, ...updates }));
  };

  const handleServiceToggle = (serviceId: string, price: number) => {
    const newSelection = new Map(selectedServices);
    let newPedicureOption = selectedPedicureOption;
    if (newSelection.has(serviceId)) {
      newSelection.delete(serviceId);
      if (serviceId === 'pedicure') {
        newPedicureOption = null;
        PEDICURE_OPTIONS.forEach(opt => newSelection.delete(opt.id));
      }
    } else {
      newSelection.set(serviceId, price);
      if (serviceId === 'pedicure') {
        newPedicureOption = PEDICURE_OPTIONS[0].id;
        newSelection.set(PEDICURE_OPTIONS[0].id, PEDICURE_OPTIONS[0].price);
      }
    }
    updateState({ selectedServices: newSelection, selectedPedicureOption: newPedicureOption });
  };
  
  const handlePedicureOptionChange = (optionId: string, price: number) => {
    const newSelection = new Map(selectedServices);
    PEDICURE_OPTIONS.forEach(opt => newSelection.delete(opt.id));
    newSelection.set(optionId, price);
    updateState({ selectedServices: newSelection, selectedPedicureOption: optionId });
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
      selectedPedicureOption: null,
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
      case 'SERVICES': return <ServicesPage bookingState={bookingState} onServiceToggle={handleServiceToggle} onPedicureOptionChange={handlePedicureOptionChange} onNext={() => updateState({ currentPage: 'DATETIME' })} onBack={() => updateState({ currentPage: 'HOME' })} />;
      case 'DATETIME': return <DateTimePage bookingState={bookingState} updateState={updateState} onNext={() => updateState({ currentPage: 'USER_INFO' })} onBack={() => updateState({ currentPage: 'SERVICES' })} />;
      case 'USER_INFO': return <UserInfoPage bookingState={bookingState} updateState={updateState} onNext={() => updateState({ currentPage: 'CONFIRM' })} onBack={() => updateState({ currentPage: 'DATETIME' })} />;
      case 'CONFIRM': return <ConfirmationPage bookingState={bookingState} totalCost={totalCost} onConfirm={() => updateState({ currentPage: 'SUCCESS' })} onBack={() => updateState({ currentPage: 'USER_INFO' })} />;
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
      Bem-vinda ao seu espaço de beleza e cuidado. Agende seu horário com facilidade.
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
  onPedicureOptionChange: (id: string, price: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const ServicesPage: React.FC<ServicesPageProps> = ({ bookingState, onServiceToggle, onPedicureOptionChange, onNext, onBack }) => (
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
              {service.id !== 'pedicure' && <span>R$ {service.price.toFixed(2)}</span>}
            </div>
          </div>
          {service.id === 'pedicure' && bookingState.selectedServices.has('pedicure') && (
            <div className="service-options">
                {PEDICURE_OPTIONS.map(opt => (
                    <label key={opt.id}>
                        <input 
                            type="radio" 
                            name="pedicureOption"
                            checked={bookingState.selectedPedicureOption === opt.id}
                            onChange={() => onPedicureOptionChange(opt.id, opt.price)}
                        />
                        {opt.name} - R$ {opt.price.toFixed(2)}
                    </label>
                ))}
            </div>
          )}
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
    const disabledSlots = useMemo(() => new Set(["11:00", "15:00"]), []);

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
  onConfirm: () => void;
  onBack: () => void;
}

const ConfirmationPage: React.FC<ConfirmationPageProps> = ({ bookingState, totalCost, onConfirm, onBack }) => {
    const { selectedServices, selectedDate, selectedTime, userInfo } = bookingState;

    const serviceNames = Array.from(selectedServices.keys()).map(id => {
        const service = SERVICES.find(s => s.id === id);
        if (service && service.id !== 'pedicure') return service.name;
        const pedicureOption = PEDICURE_OPTIONS.find(p => p.id === id);
        if (pedicureOption) return `Pedicure (${pedicureOption.name})`;
        return null;
    }).filter(Boolean);

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
            <div className="nav-buttons">
                <button onClick={onBack} className="nav-button secondary">Voltar</button>
                <button onClick={onConfirm} className="nav-button">Confirmar Agendamento</button>
            </div>
        </div>
    )
};

const SuccessPage: React.FC<{ onFinish: () => void }> = ({ onFinish }) => (
    <div className="page">
        <div className="success-message">
            <div className="success-icon">💅</div>
            <h2>Agendado com Sucesso!</h2>
            <p>Seu horário foi confirmado. Mal podemos esperar para te ver!</p>
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
            {[1,2,3,4,5,6].map(i => <img key={i} src={`https://picsum.photos/200/200?random=${i}`} alt={`Exemplo de unha ${i}`} />)}
        </div>
    </Modal>
);

const ContactModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <Modal onClose={onClose}>
        <header className="header" style={{marginBottom: "1rem"}}><h2>Contato e Endereço</h2></header>
        <div className="contact-info">
            <p><strong>Endereço:</strong> Rua das Flores, 123 - Bairro Jardim, Cidade - Estado</p>
            <p><strong>WhatsApp:</strong> (11) 98765-4321</p>
            <p><strong>Horário de Funcionamento:</strong><br/>
            Segunda a Sábado: 09:00 - 18:00<br/>
            Domingo: Fechado</p>
        </div>
    </Modal>
);

export default App;
