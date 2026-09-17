import { useRef } from 'react'
import { ScrollProvider } from './context/ScrollContext'
import { useAnchorScroll } from './hooks/useAnchorScroll'
import { useReveal } from './hooks/useReveal'
import SkipLink from './components/SkipLink'
import SiteHeader from './components/SiteHeader'
import HeroScroll from './components/HeroScroll'
import Ritual from './components/Ritual'
import FromFruitToSipzy from './components/FromFruitToSipzy'
import FindYourSipzy from './components/FindYourSipzy'
import RangeSection from './components/RangeSection'
import DuoCompare from './components/DuoCompare'
import IntroStory from './components/IntroStory'
import ManifestoContact from './components/ManifestoContact'
import SiteFooter from './components/SiteFooter'
import './styles/styles.css'

function SipzySite() {
  const rootRef = useRef(null)
  useAnchorScroll()
  useReveal(rootRef)

  return (
    <div ref={rootRef}>
      <SkipLink />
      <SiteHeader />
      <main id="main">
        <HeroScroll />
        <Ritual />
        <FromFruitToSipzy />
        <FindYourSipzy />
        <RangeSection />
        <DuoCompare />
        <IntroStory />
        <ManifestoContact />
      </main>
      <SiteFooter />
    </div>
  )
}

export default function App() {
  return (
    <ScrollProvider>
      <SipzySite />
    </ScrollProvider>
  )
}
