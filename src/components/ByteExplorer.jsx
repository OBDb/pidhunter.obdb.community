import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import _ from 'lodash';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

const ByteExplorer = () => {
  const [rawInput, setRawInput] = useState('');
  const [data, setData] = useState([]);
  const [selectedBytes, setSelectedBytes] = useState(new Set());
  const [byteGroups, setByteGroups] = useState([]);
  const [byteStats, setByteStats] = useState({});
  const [error, setError] = useState('');
  const [numBytesPerLine, setNumBytesPerLine] = useState(0);
  const [groupingMode, setGroupingMode] = useState(false);
  const [currentGroup, setCurrentGroup] = useState([]);

  // Create a component to display highlighted hex data
  const HighlightedHexData = ({ text, bytesPerLine, selectedBytes, currentGroup }) => {
    if (!text) return null;

    const lines = text.trim().split('\n');
    return (
      <div className="font-mono text-sm whitespace-pre overflow-x-auto">
        {lines.map((line, lineIdx) => (
          <div key={lineIdx} className="flex">
            <span className="text-gray-500 mr-4 select-none">
              {lineIdx.toString().padStart(4, '0')}:
            </span>
            {Array.from({ length: Math.ceil(line.length / 2) }, (_, i) => {
              const byteStart = i * 2;
              const byteStr = line.slice(byteStart, byteStart + 2);
              const isSelected = selectedBytes.has(i);
              const isGrouped = currentGroup.includes(i);

              return (
                <span
                  key={i}
                  className={`mx-0.5 ${
                    isGrouped ? 'bg-green-100 text-green-800' :
                    isSelected ? 'bg-blue-100 text-blue-800' : ''
                  }`}
                >
                  {byteStr}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const processData = (input) => {
    try {
      const lines = input.trim().split('\n');
      if (lines.length === 0) {
        setError('No data provided');
        return;
      }

      // Validate hex data
      const firstLineLength = lines[0].length;
      const isValid = lines.every(line => {
        const trimmed = line.trim();
        return trimmed.length === firstLineLength && /^[0-9A-Fa-f]+$/.test(trimmed);
      });

      if (!isValid) {
        setError('Invalid data format. All lines must be hex strings of the same length.');
        return;
      }

      // Process the data
      const processedData = lines.map((line, index) => {
        const bytes = {};
        for (let i = 0; i < line.length; i += 2) {
          const byteValue = parseInt(line.slice(i, i + 2), 16);
          bytes[`byte${i/2}`] = byteValue;
        }
        return {
          index,
          ...bytes
        };
      });

      setData(processedData);
      setNumBytesPerLine(Object.keys(processedData[0]).length - 1);

      // Calculate statistics
      const stats = {};
      for (let i = 0; i < (Object.keys(processedData[0]).length - 1); i++) {
        const values = processedData.map(d => d[`byte${i}`]);
        stats[`byte${i}`] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: _.mean(values),
          stdDev: Math.sqrt(_.mean(values.map(v => Math.pow(v - _.mean(values), 2)))),
        };
      }
      setByteStats(stats);
      setError('');
    } catch (err) {
      setError('Error processing data: ' + err.message);
    }
  };

  const combineBytes = (byteValues) => {
    return byteValues.reduce((acc, val, idx) => {
      return acc + (val << (8 * (byteValues.length - 1 - idx)));
    }, 0);
  };

  const toggleByte = (byteNum) => {
    if (groupingMode) {
      if (currentGroup.includes(byteNum)) {
        setCurrentGroup(currentGroup.filter(b => b !== byteNum));
      } else {
        setCurrentGroup([...currentGroup, byteNum].sort((a, b) => a - b));
      }
    } else {
      const newSelected = new Set(selectedBytes);
      if (newSelected.has(byteNum)) {
        newSelected.delete(byteNum);
      } else {
        newSelected.add(byteNum);
      }
      setSelectedBytes(newSelected);
    }
  };

  const createGroup = () => {
    if (currentGroup.length > 0) {
      const newGroup = {
        id: byteGroups.length,
        bytes: [...currentGroup],
        name: `Group ${byteGroups.length + 1}`
      };

      // Add combined values to data
      const updatedData = data.map(sample => ({
        ...sample,
        [`group${newGroup.id}`]: combineBytes(newGroup.bytes.map(b => sample[`byte${b}`]))
      }));

      setByteGroups([...byteGroups, newGroup]);
      setData(updatedData);
      setCurrentGroup([]);
      setGroupingMode(false);
    }
  };

  const removeGroup = (groupId) => {
    setByteGroups(byteGroups.filter(g => g.id !== groupId));
    const updatedData = data.map(sample => {
      const { [`group${groupId}`]: removed, ...rest } = sample;
      return rest;
    });
    setData(updatedData);
  };

  const getLineColor = (index) => {
    const colors = [
      '#2563eb', '#16a34a', '#dc2626', '#9333ea',
      '#ea580c', '#0891b2', '#4f46e5', '#be185d'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      {(selectedBytes.size > 0 || byteGroups.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Value Changes Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="index"
                    label={{ value: 'Sample Number', position: 'bottom' }}
                  />
                  <YAxis
                    label={{ value: 'Value', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip />
                  <Legend />
                  {Array.from(selectedBytes).map((byteNum, idx) => (
                    <Line
                      key={`byte${byteNum}`}
                      type="monotone"
                      dataKey={`byte${byteNum}`}
                      name={`Byte ${byteNum}`}
                      stroke={getLineColor(idx)}
                      dot={false}
                    />
                  ))}
                  {byteGroups.map((group, idx) => (
                    <Line
                      key={`group${group.id}`}
                      type="monotone"
                      dataKey={`group${group.id}`}
                      name={`${group.name} [${group.bytes.join(', ')}]`}
                      stroke={getLineColor(idx + selectedBytes.size)}
                      dot={false}
                      strokeWidth={2}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {Array.from(selectedBytes).map((byteNum, idx) => (
                <div key={byteNum} className="p-3 border rounded">
                  <p className="font-medium" style={{color: getLineColor(idx)}}>
                    Byte {byteNum}:
                  </p>
                  <p>Range: {byteStats[`byte${byteNum}`]?.min} - {byteStats[`byte${byteNum}`]?.max}</p>
                  <p>Mean: {byteStats[`byte${byteNum}`]?.mean.toFixed(2)}</p>
                  <p>StdDev: {byteStats[`byte${byteNum}`]?.stdDev.toFixed(2)}</p>
                </div>
              ))}
              {byteGroups.map((group, idx) => {
                const groupValues = data.map(d => d[`group${group.id}`]);
                const stats = {
                  min: Math.min(...groupValues),
                  max: Math.max(...groupValues),
                  mean: _.mean(groupValues),
                  stdDev: Math.sqrt(_.mean(groupValues.map(v => Math.pow(v - _.mean(groupValues), 2))))
                };
                return (
                  <div key={group.id} className="p-3 border rounded">
                    <p className="font-medium" style={{color: getLineColor(idx + selectedBytes.size)}}>
                      {group.name} [Bytes {group.bytes.join(', ')}]:
                    </p>
                    <p>Range: {stats.min} - {stats.max}</p>
                    <p>Mean: {stats.mean.toFixed(2)}</p>
                    <p>StdDev: {stats.stdDev.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <span>Byte Position Selector</span>
              <div className="space-x-2">
                <button
                  className={`px-4 py-2 rounded ${groupingMode ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                  onClick={() => setGroupingMode(!groupingMode)}
                >
                  {groupingMode ? 'Cancel Grouping' : 'Create Group'}
                </button>
                {groupingMode && currentGroup.length > 0 && (
                  <button
                    className="px-4 py-2 bg-green-500 text-white rounded"
                    onClick={createGroup}
                  >
                    Save Group
                  </button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-2">
              {Array.from({ length: numBytesPerLine }, (_, i) => (
                <button
                  key={i}
                  onClick={() => toggleByte(i)}
                  className={`p-2 text-sm font-mono border rounded hover:bg-gray-100
                    ${currentGroup.includes(i) ? 'bg-green-100 border-green-500' :
                      selectedBytes.has(i) ? 'bg-blue-100 border-blue-500' : 'bg-white'}
                    ${byteStats[`byte${i}`]?.stdDev > 0 ? 'text-black' : 'text-gray-400'}`}
                >
                  {i.toString().padStart(2, '0')}
                </button>
              ))}
            </div>

            {byteGroups.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium mb-2">Byte Groups:</h3>
                <div className="space-y-2">
                  {byteGroups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2 p-2 border rounded">
                      <span className="font-medium">{group.name}:</span>
                      <span className="font-mono">
                        Bytes [{group.bytes.join(', ')}]
                      </span>
                      <button
                        className="ml-auto px-2 py-1 text-red-500 hover:bg-red-50 rounded"
                        onClick={() => removeGroup(group.id)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Data Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <textarea
              className="w-full h-32 p-2 font-mono text-sm border rounded"
              placeholder="Paste hex data here (one line per sample)"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
            <div className="flex justify-between items-center">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onClick={() => processData(rawInput)}
              >
                Analyze Data
              </button>
              {error && <p className="text-red-500">{error}</p>}
            </div>
            {rawInput && (
              <div className="mt-4 border rounded p-4 bg-gray-50">
                <h3 className="text-sm font-medium mb-2">Data Preview:</h3>
                <HighlightedHexData
                  text={rawInput}
                  bytesPerLine={numBytesPerLine}
                  selectedBytes={selectedBytes}
                  currentGroup={currentGroup}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ByteExplorer;