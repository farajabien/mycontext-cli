import Link from 'next/link';
import ModeToggle from '@/components/ModeToggle';

const Header = () => {
  return (
    <header className="bg-white dark:bg-gray-900 shadow-md">
      <nav className="container mx-auto flex items-center justify-between py-4 px-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          <Link href="/">Antigravity OS</Link>
        </h1>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </nav>
    </header>
  );
};

export default Header;