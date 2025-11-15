


import React, { useState, useEffect } from 'react';
import { useVoiceBooking } from './hooks/useVoiceBooking';
import { BookingStep } from './types';
import { Icon } from './components/Icon';
import { Chatbot } from './components/Chatbot';
import { VolumeIndicator } from './components/VolumeIndicator';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onConfirm, onCancel, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-scale-in-fast" role="alertdialog" aria-modal="true" aria-labelledby="dialog_title" aria-describedby="dialog_description">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/50 mb-4">
          <Icon type="error" className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="text-lg font-medium leading-6 text-white" id="dialog_title">
          {title}
        </h3>
        <div className="mt-2">
          <p className="text-sm text-gray-400" id="dialog_description">
            {message}
          </p>
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-6 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:text-sm transition-colors"
            onClick={onConfirm}
          >
            Yes, Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-gray-600 bg-transparent px-6 py-2 text-base font-medium text-gray-300 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 sm:text-sm transition-colors"
            onClick={onCancel}
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

const DPWorldLogo: React.FC<{ className?: string }> = ({ className }) => (
    <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTQtgmeAwMM5bX1h37Kffmuo69wSF9HK0_PAB-svHVcrg&s=10" alt="DP World Logo" className={className} />
);


const App: React.FC = () => {
  const { bookingStep, dpwRef, token, error, startBooking, reset, containerNumber, containerLocation, gateInTime, volume, submitManualInput } = useVoiceBooking();
  const [showSplash, setShowSplash] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [manualInput, setManualInput] = useState('');


  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    if (!showSplash && bookingStep === BookingStep.IDLE) {
      startBooking();
    }
  }, [showSplash, bookingStep, startBooking]);
  
  useEffect(() => {
    // Reset manual input when step changes
    setManualInput('');
  }, [bookingStep]);

  const getStatusMessage = () => {
    switch (bookingStep) {
      case BookingStep.IDLE:
        return 'Welcome to DP World Container Booking System.';
      case BookingStep.CONNECTING:
        return 'Connecting to booking service...';
      case BookingStep.LISTENING_DPW:
        return 'Please say your 7-digit DPW Reference Number now.';
      case BookingStep.CONFIRMING_DPW:
        return 'Awaiting confirmation for DPW Reference...';
      case BookingStep.LISTENING_TOKEN:
        return 'Thank you. Now, please say your 6-digit Token Number.';
      case BookingStep.CONFIRMING_TOKEN:
        return 'Awaiting confirmation for Token Number...';
      case BookingStep.CONFIRMING_BOOKING:
        return 'Please confirm both numbers to finalize your booking.';
      case BookingStep.PROCESSING:
        return 'Booking your container, please wait...';
      case BookingStep.SUCCESS:
        return 'Your container has been successfully booked.';
      case BookingStep.ERROR:
        return error || 'An unknown error occurred.';
      default:
        return '';
    }
  };

  const renderBookingInfo = () => (
    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-8 text-lg">
      <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg min-w-[200px]">
        <span className="text-sm font-semibold text-gray-300">DPW Reference</span>
        <span className="text-2xl font-mono tracking-widest h-8">{dpwRef || '*******'}</span>
      </div>
      <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg min-w-[200px]">
        <span className="text-sm font-semibold text-gray-300">Token Number</span>
        <span className="text-2xl font-mono tracking-widest h-8">{token || '******'}</span>
      </div>
    </div>
  );
  
  const renderSuccessInfo = () => (
    <div className="flex flex-col xl:flex-row space-y-4 xl:space-y-0 xl:space-x-6 text-lg mt-6">
      <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg min-w-[240px] animate-slide-fade-in" style={{ animationDelay: '200ms' }}>
        <span className="text-sm font-semibold text-gray-300">Container Number</span>
        <span className="text-2xl font-mono tracking-widest h-8">{containerNumber}</span>
      </div>
      <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg min-w-[240px] animate-slide-fade-in" style={{ animationDelay: '400ms' }}>
        <span className="text-sm font-semibold text-gray-300">Location</span>
        <span className="text-2xl font-mono tracking-widest h-8">{containerLocation}</span>
      </div>
      <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg min-w-[240px] animate-slide-fade-in" style={{ animationDelay: '600ms' }}>
        <span className="text-sm font-semibold text-gray-300">Gate-in Time</span>
        <span className="text-2xl font-mono tracking-widest h-8">{gateInTime}</span>
      </div>
    </div>
  );

  const isListening = [
    BookingStep.LISTENING_DPW, 
    BookingStep.LISTENING_TOKEN, 
    BookingStep.CONFIRMING_DPW, 
    BookingStep.CONFIRMING_TOKEN,
    BookingStep.CONFIRMING_BOOKING,
  ].includes(bookingStep);

  const isDpwInputStep = bookingStep === BookingStep.LISTENING_DPW;
  const isTokenInputStep = bookingStep === BookingStep.LISTENING_TOKEN;
  const showManualInput = isDpwInputStep || isTokenInputStep;
  const requiredLength = isDpwInputStep ? 7 : 6;
  const isInputValid = manualInput.length === requiredLength && /^\d+$/.test(manualInput);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInputValid) {
        submitManualInput(manualInput);
        setManualInput('');
    }
  };
  
  const showVolumeIndicator = [
    BookingStep.LISTENING_DPW,
    BookingStep.LISTENING_TOKEN,
  ].includes(bookingStep);

  const showMicIcon = ![BookingStep.IDLE, BookingStep.SUCCESS, BookingStep.ERROR].includes(bookingStep);
  
  const isBookingInProgress = ![
    BookingStep.IDLE,
    BookingStep.SUCCESS,
    BookingStep.ERROR,
  ].includes(bookingStep);

  const MainContent = () => (
    <>
      <header className="absolute top-0 left-0 p-6 flex items-center">
        <DPWorldLogo className="w-10 h-10 mr-3" />
        <h1 className="text-2xl font-bold tracking-wider">DP World</h1>
      </header>

      <main className="flex flex-col items-center justify-center text-center flex-grow w-full max-w-4xl">
        {bookingStep !== BookingStep.IDLE && bookingStep !== BookingStep.SUCCESS && bookingStep !== BookingStep.ERROR && (
          <div className="mb-12">
            {renderBookingInfo()}
          </div>
        )}

        <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center mb-4">
          {isListening && (
            <>
                <div className="absolute inset-0 rounded-full bg-blue-500 animate-ripple opacity-0"></div>
                <div className="absolute inset-0 rounded-full bg-blue-500 animate-ripple opacity-0" style={{ animationDelay: '0.75s' }}></div>
            </>
          )}
          <div className={`relative w-full h-full rounded-full flex items-center justify-center transition-colors duration-300 overflow-hidden bg-white/5`}>
            {showMicIcon ? (
                <Icon type="microphone" className={`w-24 h-24 sm:w-32 sm:h-32 text-white transition-transform duration-300 ${isListening ? 'animate-pulse-glow' : ''}`} />
            ) : (
              <>
                {bookingStep === BookingStep.IDLE && <Icon type="loading" className="w-20 h-20 sm:w-28 sm:h-28 text-blue-300" />}
                {bookingStep === BookingStep.SUCCESS && (
                  <div className="w-full h-full rounded-full bg-green-500 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border-4 border-green-300 animate-success-ring"></div>
                    <Icon type="check" className="w-24 h-24 sm:w-32 sm:h-32 text-white z-10" />
                  </div>
                )}
                 {bookingStep === BookingStep.ERROR && (
                  <div className="w-full h-full rounded-full bg-red-500 flex items-center justify-center">
                    <Icon type="error" className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="h-28 flex flex-col items-center justify-start pt-2 mb-4">
            {showVolumeIndicator && <VolumeIndicator volume={volume} />}
            {showManualInput && (
                <form onSubmit={handleManualSubmit} className="mt-4 flex flex-col items-center gap-2 animate-slide-fade-in w-full max-w-xs">
                    <p className="text-sm text-gray-400">Or enter it manually:</p>
                    <div className="flex gap-2 w-full">
                        <input
                            type="tel"
                            value={manualInput}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                if (val.length <= requiredLength) {
                                    setManualInput(val);
                                }
                            }}
                            maxLength={requiredLength}
                            placeholder={isDpwInputStep ? '7-digit DPW Ref' : '6-digit Token'}
                            className="flex-grow bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-500 text-center font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                            aria-label={isDpwInputStep ? 'DPW Reference Number' : 'Token Number'}
                        />
                        <button
                            type="submit"
                            disabled={!isInputValid}
                            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:hover:bg-gray-600"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            )}
        </div>
        
        <p className={`text-xl sm:text-2xl h-16 transition-opacity duration-500 ${bookingStep === BookingStep.SUCCESS ? 'animate-slide-fade-in' : ''}`}>{getStatusMessage()}</p>
        
        {bookingStep === BookingStep.SUCCESS && (
            <>
              {renderSuccessInfo()}
              <p className="text-sm text-gray-400 mt-6 max-w-md animate-slide-fade-in" style={{ animationDelay: '800ms' }}>Your full container details and gate-in timing have been sent to your registered mobile number. Thank you for using DP World’s automated booking service.</p>
            </>
        )}

        {(bookingStep === BookingStep.SUCCESS || bookingStep === BookingStep.ERROR) && (
          <button
            onClick={reset}
            className="mt-12 px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-lg hover:bg-blue-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400"
          >
            Start New Booking
          </button>
        )}
      </main>

      {!showSplash && isBookingInProgress && (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="absolute bottom-6 left-6 px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-lg hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-4 focus:ring-red-400 z-10"
          aria-label="Cancel booking process"
        >
          Cancel
        </button>
      )}

      {!showSplash && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-400 z-10"
          aria-label="Open support chat"
        >
          <Icon type="chat" className="w-8 h-8" />
        </button>
      )}
    </>
  );
  
  const SplashScreen = () => (
     <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
            <div className="absolute h-48 w-48 rounded-full border-2 border-blue-400 opacity-0 animate-ripple"></div>
            <DPWorldLogo className="w-32 h-32 animate-scale-in" />
        </div>
        <h1 className="text-4xl font-bold tracking-wider mt-6 opacity-0 animate-fade-in-delay">DP World</h1>
    </div>
  );

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-700 ease-in-out z-20 ${showSplash ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <SplashScreen />
        </div>
        <div className={`w-full h-full flex flex-col items-center justify-center transition-opacity duration-700 ease-in-out ${showSplash ? 'opacity-0' : 'opacity-100'}`}>
             <MainContent />
        </div>
        <Chatbot isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        <ConfirmationDialog
            isOpen={showCancelConfirm}
            onConfirm={() => {
              setShowCancelConfirm(false);
              reset();
            }}
            onCancel={() => setShowCancelConfirm(false)}
            title="Cancel Booking"
            message="Are you sure you want to cancel the current booking process? This action cannot be undone."
        />
    </div>
  );
};

export default App;