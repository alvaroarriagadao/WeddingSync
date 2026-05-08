export default function Home() {
  return (
    <main className="min-h-screen bg-wedding-sand">
      <div className="container-custom py-20 text-center">
        <h1 className="text-6xl mb-4 text-wedding-dark">
          Bienvenido a WeddingSync
        </h1>
        <p className="text-xl text-wedding-dark mb-8">
          Selecciona tu rol para continuar
        </p>
        <div className="flex gap-4 justify-center">
          <a href="/login?role=guest" className="btn-primary">
            Soy Invitado
          </a>
          <a href="/login?role=admin" className="btn-secondary">
            Soy Novio/Novia
          </a>
        </div>
      </div>
    </main>
  )
}
