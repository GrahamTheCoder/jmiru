import * as React from 'react';
import './App.css';
import { getHtmlFormattedOutput } from './ts/view';

interface AppState {
  MixedInput: string;
  MixedInput2: string;
  OutputContent: string;
  ChunkDivider: string;
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      MixedInput: 'C     F     G\nここで書きてください\nkoko de kakite kudasai\nwrite here please',
      MixedInput2: 'Add information from another source here',
      OutputContent: '',
      ChunkDivider: '\n\n\n\n' // Divider in line by line formats (e.g. romaji-lines, triple-newline-divider, corresponding-english-lines)
    };
    this.handleMixedInputChanged = this.handleMixedInputChanged.bind(this);
    this.handleMixedInput2Changed = this.handleMixedInput2Changed.bind(this);
    this.handleGenerateClicked = this.handleGenerateClicked.bind(this);
  }

  handleMixedInputChanged(event: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState({ MixedInput: event.target.value });
  }

  handleMixedInput2Changed(event: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState({ MixedInput2: event.target.value });
  }

  handleGenerateClicked() {
    const outputContent = getHtmlFormattedOutput([this.state.MixedInput, this.state.MixedInput2]);
    this.setState({ OutputContent: outputContent });
  }

  render() {
    return (
      <div className="App">
        <div className="App-header">
          <h2>
            <span className="App-logo">見</span>
            <span className="App-title">Welcome to JMiru</span>
          </h2>
        </div>
        <div className="App-intro">
          <div id="OutputContent" dangerouslySetInnerHTML={{ __html: this.state.OutputContent }} />
          <form id="MixedInputForm">
            <textarea id="MixedInput" className="MixedInput" onChange={this.handleMixedInputChanged} value={this.state.MixedInput} />
            <textarea id="MixedInput2" className="MixedInput" onChange={this.handleMixedInput2Changed} value={this.state.MixedInput2} />
            <input id="VisualizeButton" type="button" value="Visualize" onClick={this.handleGenerateClicked} />
          </form>
        </div>
      </div>
    );
  }
}

export default App;

export default App;
