import React from 'react';

const Container = ({ children }) => {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
};

const Header = () => {
  return (
    <header className="py-4 border-b">
      <h1 className="text-xl font-bold">Header Section</h1>
    </header>
  );
};

const Main = ({ children }) => {
  return (
    <main className="py-6">
      {children}
    </main>
  );
};

const Footer = () => {
  return (
    <footer className="py-4 border-t">
      <p className="text-sm text-gray-500">Footer Section</p>
    </footer>
  );
};

const BasicLayout = ({ children }) => {
  return (
    <Container>
      <Header />
      <Main>{children}</Main>
      <Footer />
    </Container>
  );
};

export default BasicLayout;