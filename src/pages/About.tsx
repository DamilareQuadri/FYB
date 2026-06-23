import React from 'react';

const About: React.FC = () => {
  return (
    <div className="flex flex-col w-full">


      {/* What is FYB Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">What is FYB?</h2>
            <div className="space-y-6 text-lg text-slate-600 leading-relaxed text-left" style={{ textAlign: 'justify' }}>
              <p>
                Let's be real: Final year is a lot. From chasing supervisors, to writing project chapters, and
                preparing for exams, the last thing you need is the stress of walking around market looking for Corporate
                Day suits or Denim Day jackets. That is exactly why we built FYB. We are here to take the stress out of your
                graduating week. We're going to stand as your digital fashion plug and ultimate mood board. Whether you need
                style inspiration to stand out or you want to shop for the perfect outfit with just a few clicks, we've got you covered.
                No market stress, just pure, premium vibes for your biggest week on campus. You did the hard work to graduate.
                Now, let us handle the looks!
              </p>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};

export default About;
