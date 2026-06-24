import { MidnightRelay } from './components/generated/MidnightRelay';

type Theme = 'light' | 'dark';

const theme: Theme = 'light';

function App() {
  function setTheme(theme: Theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  setTheme(theme);

  return (
    <>
      <MidnightRelay />
    </>
  ); // %EXPORT_STATEMENT%
}

export default App;
