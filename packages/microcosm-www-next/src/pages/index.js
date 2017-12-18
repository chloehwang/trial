import React from 'react'
import data from '../data/index.json'
import Graphic from '../components/graphic'

export default class IndexPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      numSections: 3,
      text: data[1].text,
      heading: data[1].heading,
      graphicUrl: data[1].microcosmGraphicUrl,
    }
  }

  componentDidMount() {
    // TODO later - accessibility to alert on change
    this.setVars()
    this.beginObserve()
  }

  setVars() {
    this.onMicrocosmView = true
    this.currentSection = 1
    this.observeOptions = {
      root: null,
      rootMargin: '0px 0px 100px',
      threshold: 1.0,
    }

    this.text = document.getElementById('text')
    this.heading = document.getElementById('heading')
    this.subheadingTop = document.getElementById('subheading-top')
    this.subheadingBottom = document.getElementById('subheading-bottom')
    this.graphics = document.querySelectorAll('[data-module="ObserveGraphic"]')
  }

  beginObserve() {
    //create new Observer instance
    let observer = new IntersectionObserver(
      this.onIntersection,
      this.observeOptions
    )

    //start observing each graphic
    this.graphics.forEach(graphic => observer.observe(graphic))
  }

  onIntersection = observed => {
    let entry = observed[0]
    let section = entry.target.dataset.section
    let notAlreadyVisible = section !== this.currentSection

    if (entry.isIntersecting && notAlreadyVisible) {
      this.currentSection = section
      this.sectionData = data[section]

      let heading = this.changeHeading()
      let text = this.changeText()
      let graphicUrl = this.changeGraphic()

      this.setState({ heading, text, graphicUrl })
    }
  }

  changeHeading() {
    let newHeading = this.sectionData.heading
    return newHeading
  }

  changeText() {
    let newText = this.onMicrocosmView
      ? this.sectionData.microcosmText
      : this.sectionData.browserText

    return newText
  }

  changeGraphic() {
    let newGraphicUrl = this.onMicrocosmView
      ? this.sectionData.microcosmGraphicUrl
      : this.sectionData.browserGraphicUrl

    return newGraphicUrl
  }

  switchView = e => {
    this.sectionData = data[this.currentSection]
    this.onMicrocosmView = !this.onMicrocosmView

    let text = this.changeText()
    let graphicUrl = this.changeGraphic()

    this.setState({ text, graphicUrl })
  }

  render() {
    return (
      <div className="wrapper">
        <section className="section">
          <div className="section__content">
            <h2
              id="heading"
              className="section__content__heading"
              dangerouslySetInnerHTML={{ __html: this.state.heading }}
            />

            <h3
              id="subheading-top"
              className={'section__content__subheading -top' + (this.onMicrocosmView ? '' : ' -browserView')}
            >
              In
            </h3>
            <p
              id="text"
              className="section__content__text"
              dangerouslySetInnerHTML={{ __html: this.state.text }}
            />

            <h3
              id="subheading-bottom"
              className={'section__content__subheading -bottom' + (this.onMicrocosmView ? '' : ' -browserView')}
            >
              Meanwhile, in
            </h3>
            <button
              onClick={this.switchView}
              className={'section__browser-btn' + (this.onMicrocosmView ? '' : ' -browserView')}
            />
          </div>

          <div className="section__graphic">
            {Array(this.state.numSections)
              .fill()
              .map((el, i) => (
                <Graphic
                  key={i}
                  section={i + 1}
                  graphicUrl={this.state.graphicUrl}
                />
              ))}
          </div>
        </section>
      </div>
    )
  }
}
