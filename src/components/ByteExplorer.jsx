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

      // Calculate statistics for each byte position
      const stats = {};
      const numBytes = Object.keys(processedData[0]).length - 1;
      setNumBytesPerLine(numBytes);

      for (let i = 0; i < numBytes; i++) {
        const values = processedData.map(d => d[`byte${i}`]);
        stats[`byte${i}`] = {
          min: Math.min(...values),
          max: Math.max(...values),
          mean: _.mean(values),
          stdDev: Math.sqrt(_.mean(values.map(v => Math.pow(v - _.mean(values), 2)))),
        };
      }

      // Add combined values for existing groups
      byteGroups.forEach((group, groupIndex) => {
        processedData.forEach(sample => {
          const combinedValue = combineBytes(group.bytes.map(b => sample[`byte${b}`]));
          sample[`group${groupIndex}`] = combinedValue;
        });
      });

      setData(processedData);
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

  // Generate colors for lines
  const getLineColor = (index) => {
    const colors = [
      '#2563eb', // blue
      '#16a34a', // green
      '#dc2626', // red
      '#9333ea', // purple
      '#ea580c', // orange
      '#0891b2', // cyan
      '#4f46e5', // indigo
      '#be185d', // pink
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Data Input</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full h-32 p-2 font-mono text-sm border rounded"
            placeholder="Paste hex data here (one line per sample)"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
          />
          <div className="mt-2 flex justify-between items-center">
            <button
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              onClick={() => processData(rawInput)}
            >
              Analyze Data
            </button>
            {error && <p className="text-red-500">{error}</p>}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
};

export default ByteExplorer;