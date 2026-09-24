import { apiLogin, apiChangePassword, setStoredUser } from '../utils/authClient';
import { UserAccount } from '../types';
import { googleDriveService } from '../services/googleDriveService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: UserAccount, token?: string) => void;
  onLoginSuccess?: (user: UserAccount, token?: string) => void;
  onOpenSubscription?: () => void;
  onContinueDemo?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  onOpenSubscription,
  onContinueDemo,
}) => {
  const [step, setStep] = useState<'LOGIN' | 'CHANGE_PASSWORD' | 'LINK_STORAGE'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [linkingDrive, setLinkingDrive] = useState(false);
  const [driveLinkSuccess, setDriveLinkSuccess] = useState(false);

  // First-time password change state
  const [pendingUser, setPendingUser] = useState<UserAccount | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Security: never retain entered credentials when the login modal is reopened.
  useEffect(() => {
    if (!isOpen) return;
    setStep('LOGIN');
    setUsername('');
    setPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPendingUser(null);
    setPendingToken(null);
    setError(null);
    setChangeSuccess(false);
    setDriveLinkSuccess(false);
    setShowPassword(false);
    setRememberMe(false);
  }, [isOpen]);

  // Body scroll lock while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerBurst = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'],
      });
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);
